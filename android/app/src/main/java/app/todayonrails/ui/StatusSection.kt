package app.todayonrails.ui

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.view.View
import android.widget.Button
import android.widget.TextView
import app.todayonrails.R
import app.todayonrails.gadgetbridge.Gadgetbridge
import app.todayonrails.settings.Settings

// Gadgetbridge found? Calendar access? When was the last update? Plus the two buttons.
class StatusSection(
    private val activity: Activity,
    private val settings: Settings,
    onAllowCalendar: () -> Unit,
    onSendNow: () -> Unit,
) {
    private val status = activity.findViewById<TextView>(R.id.status)
    private val allowCalendar = activity.findViewById<Button>(R.id.allowCalendar)
    private val sendNow = activity.findViewById<Button>(R.id.sendNow)
    private val agenda = activity.findViewById<TextView>(R.id.agenda)

    init {
        allowCalendar.setOnClickListener { onAllowCalendar() }
        sendNow.setOnClickListener { onSendNow() }
    }

    fun hasCalendarAccess() =
        activity.checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED

    fun show() {
        val calendar = hasCalendarAccess()
        val gadgetbridge = Gadgetbridge.installedPackage(activity) != null
        status.text = listOf(
            activity.getString(if (gadgetbridge) R.string.status_gadgetbridge_ok else R.string.status_gadgetbridge_missing),
            activity.getString(if (calendar) R.string.status_calendar_ok else R.string.status_calendar_missing),
            activity.getString(R.string.status_last_sync, settings.lastSync.ifEmpty { activity.getString(R.string.status_never) }),
        ).joinToString("\n")
        allowCalendar.visibility = if (calendar) View.GONE else View.VISIBLE
        sendNow.isEnabled = calendar
        agenda.text = settings.lastAgenda.ifEmpty { "–" }
    }

    fun setBusy(busy: Boolean) {
        sendNow.isEnabled = !busy && hasCalendarAccess()
        sendNow.setText(if (busy) R.string.sending else R.string.send_now)
    }
}
