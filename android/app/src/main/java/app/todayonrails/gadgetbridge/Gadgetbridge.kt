package app.todayonrails.gadgetbridge

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import app.todayonrails.weather.OpenMeteo
import app.todayonrails.weather.OpenMeteo.kelvin
import app.todayonrails.weather.OpenMeteo.owmCode
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.zip.GZIPOutputStream

// Talks to Gadgetbridge: finds the installed build and sends it a weather report.
// The agenda text goes in `location`; Gadgetbridge passes it to the watch as the city name.
// Field names follow Gadgetbridge's GenericWeatherReceiver (Kelvin, OpenWeatherMap codes).
object Gadgetbridge {
    private const val ACTION = "nodomain.freeyourgadget.gadgetbridge.ACTION_GENERIC_WEATHER"

    // Release, nightly and Bangle.js builds (declared in the manifest's <queries>)
    private val PACKAGES = listOf(
        "nodomain.freeyourgadget.gadgetbridge",
        "nodomain.freeyourgadget.gadgetbridge.nightly",
        "nodomain.freeyourgadget.gadgetbridge.nightly_nopebble",
        "com.espruino.gadgetbridge.banglejs",
    )

    fun installedPackage(context: Context): String? = PACKAGES.firstOrNull {
        try {
            context.packageManager.getPackageInfo(it, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    // Returns false when Gadgetbridge isn't installed
    fun sendWeather(context: Context, location: String, latitude: Double, longitude: Double, forecast: OpenMeteo.Forecast?): Boolean {
        val target = installedPackage(context) ?: return false
        val spec = JSONObject()
            .put("timestamp", System.currentTimeMillis() / 1000)
            .put("location", location)
            .put("latitude", latitude)
            .put("longitude", longitude)
        if (forecast != null) addForecast(spec, forecast) else addPlaceholder(spec)

        val gz = ByteArrayOutputStream().also { out ->
            GZIPOutputStream(out).use { it.write(JSONArray().put(spec).toString().toByteArray()) }
        }.toByteArray()
        context.sendBroadcast(Intent(ACTION).setPackage(target).putExtra("WeatherGz", gz))
        return true
    }

    private fun addForecast(spec: JSONObject, f: OpenMeteo.Forecast) {
        spec.put("currentTemp", kelvin(f.tempC))
            .put("currentConditionCode", owmCode(f.code))
            .put("currentCondition", OpenMeteo.description(f.code))
            .put("currentHumidity", f.humidity)
            .put("windSpeed", f.windKmh)
            .put("windDirection", f.windDirection)
        f.days.firstOrNull()?.let { today ->
            spec.put("todayMinTemp", kelvin(today.minC))
                .put("todayMaxTemp", kelvin(today.maxC))
                .put("sunRise", today.sunrise)
                .put("sunSet", today.sunset)
                .put("precipProbability", today.rainChance)
        }
        // Daily forecasts start tomorrow (today is in the fields above)
        spec.put("forecasts", JSONArray(f.days.drop(1).map {
            JSONObject().put("minTemp", kelvin(it.minC)).put("maxTemp", kelvin(it.maxC))
                .put("conditionCode", owmCode(it.code)).put("sunRise", it.sunrise).put("sunSet", it.sunset)
                .put("precipProbability", it.rainChance)
        }))
        spec.put("hourly", JSONArray(f.hours.map {
            JSONObject().put("timestamp", it.time).put("temp", kelvin(it.tempC)).put("conditionCode", owmCode(it.code))
        }))
    }

    // No real weather: neutral values. The agenda text carries "no weather", so the face hides it.
    private fun addPlaceholder(spec: JSONObject) {
        spec.put("currentTemp", kelvin(0.0)).put("todayMinTemp", kelvin(0.0)).put("todayMaxTemp", kelvin(0.0))
            .put("currentConditionCode", 800).put("currentCondition", "No weather")
            .put("forecasts", JSONArray())
    }
}
