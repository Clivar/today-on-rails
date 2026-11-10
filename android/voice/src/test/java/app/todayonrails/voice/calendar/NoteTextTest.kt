package app.todayonrails.voice.calendar

import org.junit.Assert.assertEquals
import org.junit.Test

class NoteTextTest {
    private val line = NoteText.line("14:32", "Ask Jan about the budget")

    @Test
    fun lineFormat() {
        assertEquals("[14:32] Ask Jan about the budget", line)
    }

    @Test
    fun firstNoteIsTheDescription() {
        assertEquals(line, NoteText.append(null, line))
        assertEquals(line, NoteText.append("  \n", line))
    }

    @Test
    fun laterNotesFollowAfterABlankLine() {
        assertEquals("Agenda: budget\n\n$line", NoteText.append("Agenda: budget\n", line))
        val twice = NoteText.append(NoteText.append(null, line), "[14:40] Second")
        assertEquals("$line\n\n[14:40] Second", twice)
    }

    @Test
    fun htmlDescriptionsContinueInHtml() {
        val html = "<b>Agenda</b><br>Budget"
        assertEquals("$html<br><br>[14:32] Q&amp;A &lt;draft&gt;", NoteText.append(html, "[14:32] Q&A <draft>"))
    }

    @Test
    fun angleBracketsAloneAreNotHtml() {
        assertEquals("Budget < 5k\n\n$line", NoteText.append("Budget < 5k", line))
    }
}
