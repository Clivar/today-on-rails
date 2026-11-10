package app.todayonrails.voice.ui

import android.app.Activity
import android.view.View
import android.widget.Button
import android.widget.TextView
import app.todayonrails.voice.BuildConfig
import app.todayonrails.voice.R
import app.todayonrails.voice.gadgetbridge.VoiceContract
import app.todayonrails.voice.pipeline.Pipeline

// Gadgetbridge found? Calendar access? Which model? Anything waiting to be written?
class StatusSection(
    private val activity: Activity,
    private val hasCalendarAccess: () -> Boolean,
    onAllowCalendar: () -> Unit,
) {
    private val status = activity.findViewById<TextView>(R.id.status)
    private val allowCalendar = activity.findViewById<Button>(R.id.allowCalendar)

    init {
        allowCalendar.setOnClickListener { onAllowCalendar() }
    }

    fun show() {
        val access = hasCalendarAccess()
        val waiting = Pipeline.store(activity).pending().size
        status.text = listOfNotNull(
            activity.getString(
                if (VoiceContract.installedPackage(activity) != null) R.string.status_gadgetbridge_ok else R.string.status_gadgetbridge_missing,
            ),
            activity.getString(if (access) R.string.status_calendar_ok else R.string.status_calendar_missing),
            activity.getString(R.string.status_model, BuildConfig.MODEL_NAME),
            if (waiting > 0) activity.getString(R.string.status_waiting, waiting) else null,
        ).joinToString("\n")
        allowCalendar.visibility = if (access) View.GONE else View.VISIBLE
    }
}
