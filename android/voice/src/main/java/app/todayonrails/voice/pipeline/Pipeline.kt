package app.todayonrails.voice.pipeline

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.text.format.DateFormat
import android.util.Log
import app.todayonrails.voice.BuildConfig
import app.todayonrails.voice.audio.OpusDecoder
import app.todayonrails.voice.audio.Resample
import app.todayonrails.voice.calendar.CalendarStore
import app.todayonrails.voice.calendar.CurrentEvent
import app.todayonrails.voice.calendar.NoteText
import app.todayonrails.voice.calendar.Target
import app.todayonrails.voice.recording.Recording
import app.todayonrails.voice.recording.RecordingStore
import app.todayonrails.voice.settings.Settings
import app.todayonrails.voice.transcribe.Transcript
import app.todayonrails.voice.transcribe.Whisper
import java.io.File
import java.util.Date
import java.util.concurrent.Executors

// Recording → calendar note: find the event that was running when the recording started, transcribe
// with its title as Whisper's prompt, and append the text to it (or create an event). Runs in the
// background (TranscribeJob, or the app when opened), one recording at a time on its own thread.
object Pipeline {
    private const val TAG = "VoicePipeline"
    private val executor = Executors.newSingleThreadExecutor { Thread(it, "voice-pipeline") }

    fun store(context: Context) = RecordingStore(File(context.noBackupFilesDir, "recordings"))

    // Processes every waiting recording, then calls onDone (on the pipeline thread)
    fun processPending(context: Context, onDone: () -> Unit = {}) {
        val app = context.applicationContext
        executor.execute {
            try {
                Run(app).use { run -> for (file in store(app).pending()) run.process(file) }
            } finally {
                onDone()
            }
        }
    }

    // Where a note recorded at `at` will go, without transcribing: a calendar query, milliseconds.
    // null without calendar access or a calendar to write to (the recording then waits).
    fun destination(context: Context, at: Long): Destination? {
        if (!hasCalendarAccess(context)) return null
        return when (val target = targetAt(context, Settings(context), CalendarStore(context), at)?.first) {
            is Target.Append -> Destination(target.event.title, isNew = false)
            is Target.Create -> Destination(target.title, isNew = true)
            null -> null
        }
    }

    // The target for a note at `at` and the calendar new events go to; null when a new event is needed
    // but there's no calendar to put it in
    private fun targetAt(context: Context, settings: Settings, calendar: CalendarStore, at: Long): Pair<Target, Long?>? {
        // The chosen calendar if it's still there and writable, else the primary one
        val writable = calendar.writableCalendars()
        val newEvents = writable.firstOrNull { it.id == settings.newEventsCalendar }?.id ?: writable.firstOrNull()?.id
        // The calendar of new notes events always counts, so a second note lands in the same "Notes: …"
        val lookIn = settings.lookInCalendars?.let { ids -> if (newEvents != null) ids + newEvents else ids }
        val target = CurrentEvent.target(calendar.eventsAt(at), at, lookIn)
        if (target is Target.Create && newEvents == null) return null
        return target to newEvents
    }

    private fun hasCalendarAccess(context: Context) =
        listOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR)
            .all { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }

    // One batch: the model is loaded on first use and freed at the end
    private class Run(private val context: Context) : AutoCloseable {
        private val store = store(context)
        private val settings = Settings(context)
        private val calendar = CalendarStore(context)
        private var whisper: Whisper? = null

        fun process(file: File): Outcome {
            val outcome = try {
                handle(file)
            } catch (e: Exception) {
                Log.e(TAG, "Recording ${file.name} failed", e)
                Outcome.Failed(e.message ?: e.javaClass.simpleName, keep = true)
            }
            if (outcome !is Outcome.Failed || !outcome.keep) store.delete(file)
            settings.addHistory(historyLine(file, outcome))
            return outcome
        }

        private fun handle(file: File): Outcome {
            val recording = try {
                store.read(file)
            } catch (e: Exception) {
                return Outcome.Failed("Unreadable recording: ${e.message}", keep = false)
            }
            if (!hasCalendarAccess(context)) return Outcome.Failed("Calendar access needed: open Today On Rails Voice", keep = true)
            val (target, newEvents) = targetAt(context, settings, calendar, recording.startedAt)
                ?: return Outcome.Failed("No calendar to write to: choose one in Today On Rails Voice", keep = true)

            val samples = try {
                Resample.forWhisper(OpusDecoder.decode(recording.packets))
            } catch (e: Exception) {
                Log.e(TAG, "Decoding ${file.name} failed", e)
                return Outcome.Failed("Couldn't decode the recording", keep = false)
            }
            val promptTitle = when (target) {
                is Target.Append -> target.event.title
                is Target.Create -> target.promptTitle
            }
            val model = whisper ?: Whisper.load(context.assets, BuildConfig.MODEL_ASSET).also { whisper = it }
            val started = System.currentTimeMillis()
            val transcript = Transcript.clean(model.transcribe(samples, Transcript.prompt(promptTitle), settings.language))
            Log.i(TAG, "Transcribed ${samples.size / Resample.WHISPER_RATE} s in ${System.currentTimeMillis() - started} ms")
            if (transcript.isEmpty()) return Outcome.NothingHeard

            val line = NoteText.line(time(recording), transcript)
            return when (target) {
                is Target.Append -> {
                    calendar.setDescription(target.event, NoteText.append(target.event.description, line))
                    Outcome.Added(target.event.title, transcript)
                }
                is Target.Create -> {
                    calendar.createEvent(newEvents!!, target.title, target.begin, target.end, line)
                    Outcome.Created(target.title, transcript)
                }
            }
        }

        private fun time(recording: Recording) = DateFormat.getTimeFormat(context).format(Date(recording.startedAt))

        private fun historyLine(file: File, outcome: Outcome): String {
            val at = file.name.substringBefore('.').substringBefore('-').toLongOrNull()
            val `when` = at?.let { DateFormat.format("EEE d MMM", it).toString() + " " + DateFormat.getTimeFormat(context).format(Date(it)) } ?: "?"
            val what = when (outcome) {
                is Outcome.Added -> "${outcome.eventTitle}: ${outcome.transcript}"
                is Outcome.Created -> "new ${outcome.eventTitle}: ${outcome.transcript}"
                Outcome.NothingHeard -> "nothing heard"
                is Outcome.Failed -> (if (outcome.keep) "waiting: " else "dropped: ") + outcome.message
            }
            return "$`when` · $what"
        }

        override fun close() {
            whisper?.close()
            whisper = null
        }
    }
}
