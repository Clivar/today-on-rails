package app.todayonrails.voice.ui

import android.app.Activity
import android.widget.TextView
import app.todayonrails.voice.R
import app.todayonrails.voice.settings.Settings

// The last notes and what became of them (written, new event, nothing heard, waiting).
class HistorySection(private val activity: Activity, private val settings: Settings) {
    private val list = activity.findViewById<TextView>(R.id.history)

    fun show() {
        list.text = settings.history.joinToString("\n").ifEmpty { activity.getString(R.string.recent_none) }
    }
}
