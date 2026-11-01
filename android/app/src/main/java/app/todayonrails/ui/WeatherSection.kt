package app.todayonrails.ui

import android.app.Activity
import android.widget.EditText
import android.widget.Switch
import app.todayonrails.R
import app.todayonrails.settings.Settings
import java.util.Locale

// Forecast on/off, the city name and the coordinates for the forecast.
class WeatherSection(activity: Activity, private val settings: Settings, private val onChanged: () -> Unit) {
    private val enabled = activity.findViewById<Switch>(R.id.weatherSwitch)
    private val city = activity.findViewById<EditText>(R.id.city)
    private val latitude = activity.findViewById<EditText>(R.id.latitude)
    private val longitude = activity.findViewById<EditText>(R.id.longitude)

    init {
        enabled.isChecked = settings.weatherEnabled
        city.setText(settings.city)
        // Always a dot as decimal separator: that's what the fields parse back
        latitude.setText(String.format(Locale.ROOT, "%.4f", settings.latitude))
        longitude.setText(String.format(Locale.ROOT, "%.4f", settings.longitude))
        enabled.setOnCheckedChangeListener { _, on ->
            settings.weatherEnabled = on
            onChanged()
        }
    }

    // Text fields are saved when leaving the screen; returns true when something changed
    fun save(): Boolean {
        val before = Triple(settings.city, settings.latitude, settings.longitude)
        city.text.toString().trim().takeIf { it.isNotEmpty() }?.let { settings.city = it }
        latitude.text.toString().replace(',', '.').toDoubleOrNull()?.takeIf { it in -90.0..90.0 }?.let { settings.latitude = it }
        longitude.text.toString().replace(',', '.').toDoubleOrNull()?.takeIf { it in -180.0..180.0 }?.let { settings.longitude = it }
        val changed = before != Triple(settings.city, settings.latitude, settings.longitude)
        if (changed) settings.cachedWeatherAt = 0 // new place: fetch a new forecast
        return changed
    }
}
