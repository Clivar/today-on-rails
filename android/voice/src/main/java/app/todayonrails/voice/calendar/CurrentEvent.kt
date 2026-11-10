package app.todayonrails.voice.calendar

// An event instance at the moment the recording started, as read from the calendar provider.
data class EventAt(
    val eventId: Long,
    val calendarId: Long,
    val title: String,
    val begin: Long,
    val end: Long,
    val description: String?,
    val allDay: Boolean,
    val cancelled: Boolean,
    val declined: Boolean,
    val recurring: Boolean,
    // The calendar lets us write, and so does the event (we organise it, or guests may modify it)
    val editable: Boolean,
)

// What to do with a note recorded at a given moment.
sealed interface Target {
    // Append to this event's description
    data class Append(val event: EventAt) : Target

    // Create an event: "Notes: <title>" over a running event we can't write to, else a "Voice note"
    data class Create(val title: String, val begin: Long, val end: Long, val promptTitle: String?) : Target
}

object CurrentEvent {
    const val VOICE_NOTE_TITLE = "Voice note"
    const val NOTES_PREFIX = "Notes: "
    const val VOICE_NOTE_MINUTES = 15

    // The event that was running at `at`, in the chosen calendars (null = all). Ignored: all-day events
    // (a holiday isn't what you're doing), reminders without duration, cancelled and declined events.
    // When several overlap, the one that started last is the most specific ("Lunch" inside "Workshop").
    // Events we can't write to (invitations, read-only calendars) still name the new notes event, so
    // a note during someone else's meeting lands in "Notes: <meeting>" — and the next note there
    // appends to that.
    fun target(events: List<EventAt>, at: Long, calendarIds: Set<Long>?): Target {
        val running = events
            .filter { calendarIds == null || it.calendarId in calendarIds }
            .filter { !it.allDay && !it.cancelled && !it.declined }
            .filter { it.end > it.begin && it.begin <= at && at < it.end }
            .sortedWith(compareByDescending<EventAt> { it.begin }.thenBy { it.end - it.begin })
        running.firstOrNull { it.editable }?.let { return Target.Append(it) }
        running.firstOrNull()?.let { return Target.Create(NOTES_PREFIX + it.title, it.begin, it.end, it.title) }
        val start = at - at % MINUTE_MS
        return Target.Create(VOICE_NOTE_TITLE, start, start + VOICE_NOTE_MINUTES * MINUTE_MS, null)
    }

    private const val MINUTE_MS = 60_000L
}
