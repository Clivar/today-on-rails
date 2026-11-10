package app.todayonrails.voice.calendar

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.provider.CalendarContract.Attendees
import android.provider.CalendarContract.Calendars
import android.provider.CalendarContract.Events
import android.provider.CalendarContract.Instances
import java.util.TimeZone

data class CalendarInfo(val id: Long, val name: String, val account: String, val primary: Boolean, val writable: Boolean)

// The phone's calendar provider (Google Calendar, DAVx⁵, … sync into it). READ_CALENDAR and
// WRITE_CALENDAR; no network: the calendar's own sync adapter uploads the changes.
class CalendarStore(private val context: Context) {

    // Visible calendars, primary ones first (read-only ones too: their events still name a notes event)
    fun calendars(): List<CalendarInfo> {
        val list = mutableListOf<CalendarInfo>()
        context.contentResolver.query(
            Calendars.CONTENT_URI,
            arrayOf(Calendars._ID, Calendars.CALENDAR_DISPLAY_NAME, Calendars.ACCOUNT_NAME, Calendars.IS_PRIMARY, Calendars.CALENDAR_ACCESS_LEVEL),
            "${Calendars.VISIBLE} = 1",
            null,
            null,
        )?.use { c ->
            while (c.moveToNext()) {
                list += CalendarInfo(
                    c.getLong(0), c.getString(1).orEmpty(), c.getString(2).orEmpty(), c.getInt(3) == 1,
                    writable = c.getInt(4) >= Calendars.CAL_ACCESS_CONTRIBUTOR,
                )
            }
        }
        return list.sortedWith(compareBy({ !it.primary }, { it.account }, { it.name }))
    }

    // The ones we may add events to
    fun writableCalendars() = calendars().filter { it.writable }

    // Every event instance that includes the moment `at`, in visible calendars
    fun eventsAt(at: Long): List<EventAt> {
        val uri = Instances.CONTENT_URI.buildUpon().also {
            ContentUris.appendId(it, at)
            ContentUris.appendId(it, at + 1)
        }.build()
        val projection = arrayOf(
            Instances.EVENT_ID, Instances.CALENDAR_ID, Instances.TITLE, Instances.BEGIN, Instances.END,
            Instances.DESCRIPTION, Instances.ALL_DAY, Instances.STATUS, Instances.SELF_ATTENDEE_STATUS,
            Instances.RRULE, Instances.RDATE, Instances.CALENDAR_ACCESS_LEVEL, Instances.IS_ORGANIZER,
            Instances.GUESTS_CAN_MODIFY, Instances.ORGANIZER,
        )
        val events = mutableListOf<EventAt>()
        context.contentResolver.query(uri, projection, "${Instances.VISIBLE} = 1", null, null)?.use { c ->
            while (c.moveToNext()) {
                val calendarWritable = c.getInt(11) >= Calendars.CAL_ACCESS_CONTRIBUTOR
                // Invitations: only the organiser (or guests, when allowed) may change the description;
                // the sync would otherwise undo it or fail. No organiser = a local event, ours.
                val eventWritable = c.getInt(12) == 1 || c.getInt(13) == 1 || c.getString(14).isNullOrEmpty()
                events += EventAt(
                    eventId = c.getLong(0),
                    calendarId = c.getLong(1),
                    title = c.getString(2)?.trim().orEmpty().ifEmpty { "(no title)" },
                    begin = c.getLong(3),
                    end = c.getLong(4),
                    description = c.getString(5),
                    allDay = c.getInt(6) == 1,
                    cancelled = !c.isNull(7) && c.getInt(7) == Events.STATUS_CANCELED,
                    declined = !c.isNull(8) && c.getInt(8) == Attendees.ATTENDEE_STATUS_DECLINED,
                    recurring = !c.getString(9).isNullOrEmpty() || !c.getString(10).isNullOrEmpty(),
                    editable = calendarWritable && eventWritable,
                )
            }
        }
        return events
    }

    // Writes the new description into this one instance. For a repeating event that means an exception
    // for this occurrence: updating the event itself would change every occurrence.
    fun setDescription(event: EventAt, description: String) {
        val resolver = context.contentResolver
        if (event.recurring) {
            val values = ContentValues().apply {
                put(Events.ORIGINAL_INSTANCE_TIME, event.begin)
                put(Events.DESCRIPTION, description)
            }
            resolver.insert(ContentUris.withAppendedId(Events.CONTENT_EXCEPTION_URI, event.eventId), values)
                ?: error("The calendar refused the change to \"${event.title}\"")
        } else {
            val values = ContentValues().apply { put(Events.DESCRIPTION, description) }
            val rows = resolver.update(ContentUris.withAppendedId(Events.CONTENT_URI, event.eventId), values, null, null)
            check(rows == 1) { "The calendar refused the change to \"${event.title}\"" }
        }
    }

    fun createEvent(calendarId: Long, title: String, begin: Long, end: Long, description: String) {
        val values = ContentValues().apply {
            put(Events.CALENDAR_ID, calendarId)
            put(Events.TITLE, title)
            put(Events.DESCRIPTION, description)
            put(Events.DTSTART, begin)
            put(Events.DTEND, end)
            put(Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
        }
        context.contentResolver.insert(Events.CONTENT_URI, values) ?: error("The calendar refused the new event")
    }
}
