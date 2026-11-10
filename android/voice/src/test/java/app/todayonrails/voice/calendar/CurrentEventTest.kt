package app.todayonrails.voice.calendar

import org.junit.Assert.assertEquals
import org.junit.Test

class CurrentEventTest {
    private val min = 60_000L
    private val at = 1_000 * min + 17_000 // 17 s past a minute

    private fun event(
        id: Long, title: String, begin: Long, end: Long,
        calendar: Long = 1, allDay: Boolean = false, cancelled: Boolean = false,
        declined: Boolean = false, editable: Boolean = true,
    ) = EventAt(id, calendar, title, begin, end, null, allDay, cancelled, declined, recurring = false, editable = editable)

    private fun appendsTo(target: Target) = (target as Target.Append).event.title

    @Test
    fun theRunningEventGetsTheNote() {
        val events = listOf(event(1, "Team call", at - 30 * min, at + 30 * min))
        assertEquals("Team call", appendsTo(CurrentEvent.target(events, at, null)))
    }

    @Test
    fun theMostRecentlyStartedOfOverlappingEvents() {
        val events = listOf(
            event(1, "Workshop", at - 120 * min, at + 120 * min),
            event(2, "Lunch", at - 10 * min, at + 50 * min),
        )
        assertEquals("Lunch", appendsTo(CurrentEvent.target(events, at, null)))
    }

    @Test
    fun sameStartPrefersTheShorterEvent() {
        val events = listOf(
            event(1, "Conference day", at - 5 * min, at + 480 * min),
            event(2, "Keynote", at - 5 * min, at + 55 * min),
        )
        assertEquals("Keynote", appendsTo(CurrentEvent.target(events, at, null)))
    }

    @Test
    fun startAndEndBoundaries() {
        val starting = listOf(event(1, "Starts now", at, at + 30 * min))
        assertEquals("Starts now", appendsTo(CurrentEvent.target(starting, at, null)))
        val ended = listOf(event(1, "Just ended", at - 30 * min, at))
        assertEquals(CurrentEvent.VOICE_NOTE_TITLE, (CurrentEvent.target(ended, at, null) as Target.Create).title)
    }

    @Test
    fun ignoredEvents() {
        val events = listOf(
            event(1, "Holiday", at - 600 * min, at + 600 * min, allDay = true),
            event(2, "Cancelled", at - 5 * min, at + 5 * min, cancelled = true),
            event(3, "Declined", at - 5 * min, at + 5 * min, declined = true),
            event(4, "Reminder", at - 5 * min, at - 5 * min),
            event(5, "Other calendar", at - 5 * min, at + 5 * min, calendar = 9),
        )
        val target = CurrentEvent.target(events, at, setOf(1L)) as Target.Create
        assertEquals(CurrentEvent.VOICE_NOTE_TITLE, target.title)
    }

    @Test
    fun noCalendarChoiceMeansAllCalendars() {
        val events = listOf(event(1, "Elsewhere", at - 5 * min, at + 5 * min, calendar = 9))
        assertEquals("Elsewhere", appendsTo(CurrentEvent.target(events, at, null)))
    }

    @Test
    fun nothingRunningMakesAQuarterHourVoiceNoteFromTheMinute() {
        val target = CurrentEvent.target(emptyList(), at, null) as Target.Create
        assertEquals(CurrentEvent.VOICE_NOTE_TITLE, target.title)
        assertEquals(1_000 * min, target.begin)
        assertEquals(1_015 * min, target.end)
        assertEquals(null, target.promptTitle)
    }

    @Test
    fun anInvitationWeCantEditGetsANotesEventOverItsTime() {
        val events = listOf(event(1, "Board meeting", at - 20 * min, at + 40 * min, editable = false))
        val target = CurrentEvent.target(events, at, null) as Target.Create
        assertEquals("Notes: Board meeting", target.title)
        assertEquals(at - 20 * min, target.begin)
        assertEquals(at + 40 * min, target.end)
        assertEquals("Board meeting", target.promptTitle)
    }

    @Test
    fun theNextNoteDuringThatInvitationJoinsTheNotesEvent() {
        val meeting = event(1, "Board meeting", at - 20 * min, at + 40 * min, editable = false)
        val notes = event(2, "Notes: Board meeting", at - 20 * min, at + 40 * min)
        assertEquals("Notes: Board meeting", appendsTo(CurrentEvent.target(listOf(meeting, notes), at, null)))
    }

    @Test
    fun anEditableEventWinsOverANewerReadOnlyOne() {
        val events = listOf(
            event(1, "Deep work", at - 60 * min, at + 60 * min),
            event(2, "Company all-hands", at - 5 * min, at + 25 * min, editable = false),
        )
        assertEquals("Deep work", appendsTo(CurrentEvent.target(events, at, null)))
    }
}
