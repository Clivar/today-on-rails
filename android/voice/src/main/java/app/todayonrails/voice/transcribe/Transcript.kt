package app.todayonrails.voice.transcribe

// Turns Whisper's output (one segment per line) into the note's text.
object Transcript {
    // A whole segment that only describes sound: "[BLANK_AUDIO]", "(music)", "*coughs*", "[ Silence ]"
    private val SOUND = Regex("""^\s*(\[[^\]]*]|\([^)]*\)|\*[^*]*\*)\s*$""")
    private val SPACES = Regex("""\s+""")

    fun clean(raw: String?): String =
        raw.orEmpty()
            .lines()
            .filterNot { SOUND.matches(it) }
            .joinToString(" ")
            .replace(SPACES, " ")
            .trim()

    // The prompt that steers Whisper towards the event's words (names, jargon, its language).
    // Whisper uses at most ~224 prompt tokens; an event title is far below that, but cap it anyway.
    fun prompt(eventTitle: String?): String? =
        eventTitle?.replace(SPACES, " ")?.trim()?.take(MAX_PROMPT_CHARS)?.ifEmpty { null }

    private const val MAX_PROMPT_CHARS = 300
}
