package app.todayonrails.ui

import android.app.Activity
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.TextView
import app.todayonrails.R
import app.todayonrails.calendar.CalendarReader
import app.todayonrails.settings.Settings

// A checkbox per visible calendar; by default all Google calendars are on.
class CalendarsSection(private val activity: Activity, private val settings: Settings, private val onChanged: () -> Unit) {
    private val list = activity.findViewById<LinearLayout>(R.id.calendarList)

    fun show(hasAccess: Boolean) {
        list.removeAllViews()
        val reader = CalendarReader(activity)
        val calendars = if (hasAccess) reader.calendars() else emptyList()
        if (calendars.isEmpty()) {
            list.addView(TextView(activity).apply {
                setText(R.string.calendars_none)
                setTextColor(activity.getColor(R.color.muted))
            })
            return
        }
        val selected = settings.calendarIds ?: reader.defaultCalendarIds()
        for (cal in calendars) {
            list.addView(CheckBox(activity).apply {
                text = if (cal.account.isNotEmpty() && cal.account != cal.name) "${cal.name}  ·  ${cal.account}" else cal.name
                setTextColor(activity.getColor(R.color.text))
                textSize = 16f
                minHeight = (48 * resources.displayMetrics.density).toInt()
                isChecked = cal.id in selected
                setOnCheckedChangeListener { _, on ->
                    val ids = (settings.calendarIds ?: reader.defaultCalendarIds()).toMutableSet()
                    if (on) ids += cal.id else ids -= cal.id
                    settings.calendarIds = ids
                    onChanged()
                }
            })
        }
    }
}
