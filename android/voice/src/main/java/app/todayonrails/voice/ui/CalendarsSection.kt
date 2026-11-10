package app.todayonrails.voice.ui

import android.app.Activity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import app.todayonrails.voice.R
import app.todayonrails.voice.calendar.CalendarInfo
import app.todayonrails.voice.calendar.CalendarStore
import app.todayonrails.voice.settings.Settings

// Which calendars are searched for the running event (all visible ones by default, read-only included:
// a meeting there gets a "Notes: …" event), and where new events go (the primary calendar by default).
class CalendarsSection(private val activity: Activity, private val settings: Settings) {
    private val lookIn = activity.findViewById<LinearLayout>(R.id.lookInList)
    private val newEvents = activity.findViewById<Spinner>(R.id.newEventsCalendar)

    fun show(hasAccess: Boolean) {
        lookIn.removeAllViews()
        val calendars = if (hasAccess) CalendarStore(activity).calendars() else emptyList()
        val writable = calendars.filter { it.writable }
        newEvents.visibility = if (writable.isEmpty()) View.GONE else View.VISIBLE
        if (writable.isEmpty()) {
            lookIn.addView(TextView(activity).apply {
                setText(R.string.calendars_none)
                setTextColor(activity.getColor(R.color.muted))
            })
            return
        }
        showLookIn(calendars)
        showNewEvents(writable)
    }

    private fun showLookIn(calendars: List<CalendarInfo>) {
        val all = calendars.map { it.id }.toSet()
        val selected = settings.lookInCalendars ?: all
        for (cal in calendars) {
            lookIn.addView(CheckBox(activity).apply {
                text = label(cal)
                setTextColor(activity.getColor(R.color.text))
                textSize = 16f
                minHeight = (48 * resources.displayMetrics.density).toInt()
                isChecked = cal.id in selected
                setOnCheckedChangeListener { _, on ->
                    val ids = (settings.lookInCalendars ?: all).toMutableSet()
                    if (on) ids += cal.id else ids -= cal.id
                    settings.lookInCalendars = ids
                }
            })
        }
    }

    private fun showNewEvents(calendars: List<CalendarInfo>) {
        newEvents.onItemSelectedListener = null
        newEvents.adapter = ArrayAdapter(activity, android.R.layout.simple_spinner_dropdown_item, calendars.map(::label))
        // Not chosen yet, or gone: the first one (primary calendars are listed first), as the pipeline does
        newEvents.setSelection(calendars.indexOfFirst { it.id == settings.newEventsCalendar }.coerceAtLeast(0))
        newEvents.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                settings.newEventsCalendar = calendars[position].id
            }

            override fun onNothingSelected(parent: AdapterView<*>) {}
        }
    }

    private fun label(cal: CalendarInfo) =
        if (cal.account.isNotEmpty() && cal.account != cal.name) "${cal.name}  ·  ${cal.account}" else cal.name
}
