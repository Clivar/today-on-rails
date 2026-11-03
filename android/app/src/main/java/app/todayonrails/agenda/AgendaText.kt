package app.todayonrails.agenda

import app.todayonrails.calendar.Event
import java.time.LocalDate
import java.time.LocalDateTime

// Layout settings for the watchface, sent along with the agenda
data class WatchSettings(
    val nextMinutes: Int,
    val todayCardBefore: Int,
    val todayCardDuring: Boolean,
    val getReadyMinutes: Int = 0, // events with a place: "get ready" Today card this many minutes before
    val buzzAtStart: Boolean = false, // the watch buzzes when an event starts
    val buzzBeforeEnd: Boolean = false, // ...5 minutes before an event ends
    val buzzGetReady: Boolean = false, // ...when it's time to get ready
    val railMinutes: Int = 180, // the green rail shows only when the event (its end while on) is this close (battery)
)

// Builds the text the watchface reads from the weather location name:
//   "Brussels · 31/10 · cfg next=360 focus=15 during=1 ready=0 rail=60 buzz=start · C09:00-10:30 Team call · R18:00 Water the plants · 1/11 · …"
// city · date · settings · items · date · items … (R = reminder, C = calendar event with end time,
// C@ = an event with a place).
// The watchface parses it in watchface/src/data/agenda.js; the format is described in the README.
object AgendaText {
    private const val SEP = " · "
    const val NO_WEATHER = "no weather"

    // Verified: 200 characters reach the watchface intact; stay well under the ~1 KB message limit
    const val MAX_CHARS = 400
    private const val MAX_TITLE = 40

    fun build(city: String, today: LocalDate, events: List<Event>, settings: WatchSettings, withWeather: Boolean): String {
        // Start at the first event's day if it began before today (an ongoing overnight event)
        var day = minOf(today, events.firstOrNull()?.start?.toLocalDate() ?: today)
        val head = listOf(clean(city).ifEmpty { "Today On Rails" }, date(day), settings(settings))
        val tail = if (withWeather) "" else SEP + NO_WEATHER

        val parts = head.toMutableList()
        for (e in events) {
            val add = mutableListOf<String>()
            if (e.start.toLocalDate() != day) add += date(e.start.toLocalDate())
            add += item(e)
            if ((parts + add).joinToString(SEP).length + tail.length > MAX_CHARS) break // later events don't fit
            parts += add
            day = e.start.toLocalDate()
        }
        return parts.joinToString(SEP) + tail
    }

    private fun settings(s: WatchSettings): String {
        val buzz = listOfNotNull(
            "start".takeIf { s.buzzAtStart },
            "end".takeIf { s.buzzBeforeEnd },
            "ready".takeIf { s.buzzGetReady && s.getReadyMinutes > 0 },
        ).ifEmpty { listOf("none") }.joinToString("+")
        return "cfg next=${s.nextMinutes} focus=${s.todayCardBefore} during=${if (s.todayCardDuring) 1 else 0} " +
            "ready=${s.getReadyMinutes} rail=${s.railMinutes} buzz=$buzz"
    }

    private fun date(d: LocalDate) = "${d.dayOfMonth}/${d.monthValue}"

    private fun item(e: Event): String {
        val title = clean(e.title).take(MAX_TITLE).trimEnd()
        if (e.isReminder) return "R${hhmm(e.start)} $title"
        // The watch reads the end as "the next time it's this late"; keep long events within a day
        val end = if (e.end.isAfter(e.start.plusHours(23))) e.start.plusHours(23).plusMinutes(59) else e.end
        return "C${if (e.hasPlace) "@" else ""}${hhmm(e.start)}-${hhmm(end)} $title"
    }

    private fun hhmm(t: LocalDateTime) = "%02d:%02d".format(t.hour, t.minute)

    // The separator must never appear inside a title
    private fun clean(s: String) = s.replace("·", "-").replace(Regex("\\s+"), " ").trim()
}
