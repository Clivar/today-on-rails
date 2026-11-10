package app.todayonrails.voice.ui

import android.app.Activity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import app.todayonrails.voice.R
import app.todayonrails.voice.settings.Settings

// The language Whisper listens for: detected per note by default.
class LanguageSection(activity: Activity, settings: Settings) {
    init {
        val spinner = activity.findViewById<Spinner>(R.id.language)
        val labels = activity.resources.getStringArray(R.array.languages)
        val codes = activity.resources.getStringArray(R.array.language_codes)
        spinner.adapter = ArrayAdapter(activity, android.R.layout.simple_spinner_dropdown_item, labels)
        spinner.setSelection(codes.indexOf(settings.language).coerceAtLeast(0))
        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                settings.language = codes[position]
            }

            override fun onNothingSelected(parent: AdapterView<*>) {}
        }
    }
}
