package app.todayonrails.voice.calendar

// How a voice note is written into an event's description.
object NoteText {
    private val HTML = Regex("""<(br|p|div|ul|li|b|i|span|a)\b[^>]*>|</\w+>""", RegexOption.IGNORE_CASE)

    // One note: "[14:32] what was said"
    fun line(time: String, transcript: String) = "[$time] $transcript"

    // Adds the note at the end of the description, after a blank line. Google Calendar sometimes stores
    // descriptions as HTML, where newlines would vanish: continue those with <br> instead.
    fun append(description: String?, line: String): String {
        val existing = description?.trimEnd().orEmpty()
        if (existing.isEmpty()) return line
        val html = HTML.containsMatchIn(existing)
        return if (html) "$existing<br><br>${escapeHtml(line)}" else "$existing\n\n$line"
    }

    private fun escapeHtml(text: String) =
        text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
}
