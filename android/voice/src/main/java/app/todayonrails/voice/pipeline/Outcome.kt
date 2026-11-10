package app.todayonrails.voice.pipeline

// What became of one recording (shown in the app's recent notes).
sealed interface Outcome {
    data class Added(val eventTitle: String, val transcript: String) : Outcome
    data class Created(val eventTitle: String, val transcript: String) : Outcome
    data object NothingHeard : Outcome

    // keep: the recording stays and is tried again on the next run (e.g. calendar access missing)
    data class Failed(val message: String, val keep: Boolean) : Outcome
}

// Where a note will go, known before it's transcribed: an event to append to, or one to create.
data class Destination(val eventTitle: String, val isNew: Boolean)

// What the watch shows right after recording (Zepp Flow's reply screen: title, subtitle, text; or a
// plain error). The transcript isn't ready yet: it goes into the calendar in the background.
data class WatchReply(val title: String, val subtitle: String, val text: String, val isError: Boolean) {
    companion object {
        fun saved(destination: Destination?): WatchReply = when {
            destination == null -> WatchReply("Saved", "", TRANSCRIBING, false)
            destination.isNew -> WatchReply("Saved", "New: ${destination.eventTitle}", TRANSCRIBING, false)
            else -> WatchReply("Saved", destination.eventTitle, TRANSCRIBING, false)
        }

        fun error(text: String) = WatchReply("", "", text, true)

        const val NOTHING_RECORDED = "Didn't catch that"
        const val NOT_SAVED = "Couldn't save the recording"
        private const val TRANSCRIBING = "Transcribing on the phone"
    }
}
