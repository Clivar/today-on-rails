package app.todayonrails.agenda

import app.todayonrails.calendar.Event
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime

// The watchface parses these strings (watchface/src/data/agenda.js, tests in tests/watch/; shared cases: AgendaParityTest).
class AgendaTextTest {
    private val today = LocalDate.of(2026, 10, 31)
    private val settings = WatchSettings(nextMinutes = 120, todayCardBefore = 15, todayCardDuring = true)
    private fun at(day: Int, h: Int, m: Int) = LocalDateTime.of(2026, 10, day, h, m)

    @Test
    fun `city, date, settings and items with end times`() {
        val events = listOf(
            Event(at(31, 9, 0), at(31, 10, 30), "Team call"),
            Event(at(31, 18, 0), at(31, 18, 0), "Water the plants"),
        )
        assertEquals(
            "Brussels · 31/10 · cfg next=120 focus=15 during=1 ready=0 rail=180 buzz=none · C09:00-10:30 Team call · R18:00 Water the plants",
            AgendaText.build("Brussels", today, events, settings, withWeather = true),
        )
    }

    @Test
    fun `an ongoing overnight event starts the list on its own day`() {
        val events = listOf(Event(at(30, 23, 0), at(31, 1, 0), "Night shift"), Event(at(31, 9, 0), at(31, 10, 0), "Gym"))
        assertEquals(
            "Brussels · 30/10 · cfg next=120 focus=15 during=1 ready=0 rail=180 buzz=none · C23:00-01:00 Night shift · 31/10 · C09:00-10:00 Gym",
            AgendaText.build("Brussels", today, events, settings, withWeather = true),
        )
    }

    @Test
    fun `events with a place are marked, with the get-ready time in the settings`() {
        val s = settings.copy(getReadyMinutes = 60)
        val text = AgendaText.build("Brussels", today, listOf(Event(at(31, 14, 0), at(31, 15, 0), "Dentist", "Kerkstraat 1")), s, true)
        assertEquals("Brussels · 31/10 · cfg next=120 focus=15 during=1 ready=60 rail=180 buzz=none · C@14:00-15:00 Dentist", text)
    }

    @Test
    fun `buzz moments travel in the settings`() {
        val s = settings.copy(getReadyMinutes = 60, buzzAtStart = true, buzzBeforeEnd = true, buzzGetReady = true)
        val text = AgendaText.build("Brussels", today, emptyList(), s, true)
        assertEquals("Brussels · 31/10 · cfg next=120 focus=15 during=1 ready=60 rail=180 buzz=start+end+ready", text)
    }

    @Test
    fun `the rail length travels in the settings`() {
        val s = settings.copy(railMinutes = 30, buzzAtStart = true)
        val text = AgendaText.build("Brussels", today, emptyList(), s, true)
        assertEquals("Brussels · 31/10 · cfg next=120 focus=15 during=1 ready=0 rail=30 buzz=start", text)
    }

    @Test
    fun `no weather is marked at the end`() {
        val text = AgendaText.build("Brussels", today, emptyList(), settings, withWeather = false)
        assertEquals("Brussels · 31/10 · cfg next=120 focus=15 during=1 ready=0 rail=180 buzz=none · no weather", text)
    }

    @Test
    fun `the separator never appears inside a title`() {
        val text = AgendaText.build("Brussels", today, listOf(Event(at(31, 9, 0), at(31, 9, 30), "A · B")), settings, true)
        assertTrue(text.endsWith("C09:00-09:30 A - B"))
    }

    @Test
    fun `stays within the size limit`() {
        val events = (0 until 50).map { Event(at(31, 9, 0).plusHours(it.toLong()), at(31, 9, 30).plusHours(it.toLong()), "Event number $it with a longer title") }
        val text = AgendaText.build("Brussels", today, events, settings, withWeather = false)
        assertTrue(text.length <= AgendaText.MAX_CHARS)
        assertTrue(text.endsWith(" · no weather"))
    }

    @Test
    fun `very long events are kept within a day`() {
        val text = AgendaText.build("X", today, listOf(Event(at(31, 9, 0), at(31, 9, 0).plusDays(3), "Conference")), settings, true)
        assertTrue(text.endsWith("C09:00-08:59 Conference"))
    }
}
