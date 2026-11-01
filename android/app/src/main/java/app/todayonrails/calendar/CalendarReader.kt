package app.todayonrails.calendar

import android.content.ContentUris
import android.content.Context
import android.provider.CalendarContract.Attendees
import android.provider.CalendarContract.Calendars
import android.provider.CalendarContract.Events
import android.provider.CalendarContract.Instances
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

// One event that hasn't ended yet. A reminder is an event without duration (start == end).
// place: the event's location, if it has one.
data class Event(val start: LocalDateTime, val end: LocalDateTime, val title: String, val place: String? = null) {
    val isReminder get() = !end.isAfter(start)
    val hasPlace get() = !place.isNullOrBlank()
}

data class CalendarInfo(val id: Long, val name: String, val account: String, val isGoogle: Boolean)

// Reads the phone's calendar provider (which Google Calendar syncs into). Needs READ_CALENDAR;
// no network involved.
class CalendarReader(private val context: Context) {

    // Visible calendars, Google ones first
    fun calendars(): List<CalendarInfo> {
        val list = mutableListOf<CalendarInfo>()
        context.contentResolver.query(
            Calendars.CONTENT_URI,
            arrayOf(Calendars._ID, Calendars.CALENDAR_DISPLAY_NAME, Calendars.ACCOUNT_NAME, Calendars.ACCOUNT_TYPE),
            "${Calendars.VISIBLE} = 1",
            null,
            null,
        )?.use { c ->
            while (c.moveToNext()) {
                list += CalendarInfo(c.getLong(0), c.getString(1).orEmpty(), c.getString(2).orEmpty(), c.getString(3) == GOOGLE)
            }
        }
        return list.sortedWith(compareBy({ !it.isGoogle }, { it.account }, { it.name }))
    }

    // The default selection: all visible Google calendars
    fun defaultCalendarIds() = calendars().filter { it.isGoogle }.map { it.id }.toSet()

    // Events that are ongoing or start within `days`, from the given calendars, by start time.
    // Skips all-day, cancelled and declined events.
    fun upcoming(calendarIds: Set<Long>, days: Int): List<Event> {
        if (calendarIds.isEmpty()) return emptyList()
        val now = System.currentTimeMillis()
        // Instances overlapping [now, now + days]: includes events that are already ongoing
        val uri = Instances.CONTENT_URI.buildUpon().also {
            ContentUris.appendId(it, now)
            ContentUris.appendId(it, now + days * DAY_MS)
        }.build()
        val projection = arrayOf(Instances.BEGIN, Instances.END, Instances.TITLE, Instances.CALENDAR_ID, Instances.EVENT_LOCATION)
        // Status columns can be NULL
        val selection = "${Instances.ALL_DAY} = 0" +
            " AND (${Instances.STATUS} IS NULL OR ${Instances.STATUS} != ${Events.STATUS_CANCELED})" +
            " AND (${Instances.SELF_ATTENDEE_STATUS} IS NULL OR ${Instances.SELF_ATTENDEE_STATUS} != ${Attendees.ATTENDEE_STATUS_DECLINED})"
        val zone = ZoneId.systemDefault()
        val time = { ms: Long -> LocalDateTime.ofInstant(Instant.ofEpochMilli(ms), zone) }

        val events = mutableListOf<Event>()
        context.contentResolver.query(uri, projection, selection, null, "${Instances.BEGIN} ASC")?.use { c ->
            while (c.moveToNext()) {
                if (c.getLong(3) !in calendarIds) continue
                val begin = c.getLong(0)
                val end = maxOf(begin, c.getLong(1))
                val over = if (end > begin) end <= now else begin < now
                if (over) continue
                events += Event(
                    start = time(begin),
                    end = time(end),
                    title = c.getString(2)?.trim().orEmpty().ifEmpty { "(no title)" },
                    place = c.getString(4)?.trim()?.ifEmpty { null },
                )
            }
        }
        return events
    }

    private companion object {
        const val GOOGLE = "com.google"
        const val DAY_MS = 24 * 60 * 60 * 1000L
    }
}
