package app.todayonrails.ui

import android.app.Activity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.Switch
import app.todayonrails.R
import app.todayonrails.settings.Settings

// Buzzes on the watch (event start, 5 minutes before the end) and "get ready" for events with a place.
// The watch buzzes by itself; these settings travel to it with the agenda.
class NudgesSection(activity: Activity, private val settings: Settings, private val onChanged: () -> Unit) {
    private val getReadyOptions = activity.findViewById<LinearLayout>(R.id.getReadyOptions)

    init {
        toggle(activity.findViewById(R.id.buzzAtStart), settings.buzzAtStart) { settings.buzzAtStart = it }
        toggle(activity.findViewById(R.id.buzzBeforeEnd), settings.buzzBeforeEnd) { settings.buzzBeforeEnd = it }
        toggle(activity.findViewById(R.id.getReady), settings.getReadyEnabled) {
            settings.getReadyEnabled = it
            showOptions()
        }
        toggle(activity.findViewById(R.id.buzzGetReady), settings.buzzGetReady) { settings.buzzGetReady = it }

        val minutes = activity.findViewById<Spinner>(R.id.getReadyMinutes)
        minutes.adapter = ArrayAdapter.createFromResource(activity, R.array.get_ready_choices, android.R.layout.simple_spinner_dropdown_item)
        minutes.setSelection(GET_READY_CHOICES.indexOf(settings.getReadyMinutes).coerceAtLeast(0), false)
        minutes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (GET_READY_CHOICES[position] == settings.getReadyMinutes) return
                settings.getReadyMinutes = GET_READY_CHOICES[position]
                onChanged()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        showOptions()
    }

    // The lead time and its buzz only matter when "get ready" is on
    private fun showOptions() {
        getReadyOptions.visibility = if (settings.getReadyEnabled) View.VISIBLE else View.GONE
    }

    private fun toggle(view: Switch, current: Boolean, save: (Boolean) -> Unit) {
        view.isChecked = current
        view.setOnCheckedChangeListener { _, on ->
            save(on)
            onChanged()
        }
    }

    companion object {
        // Minutes, matching R.array.get_ready_choices
        val GET_READY_CHOICES = listOf(30, 60, 90, 120)
    }
}
