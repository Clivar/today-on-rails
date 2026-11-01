package app.todayonrails.weather

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.roundToInt

// The forecast from Open-Meteo (no account or API key; only the coordinates are sent).
// This is the app's only network use. Returns null when the network isn't available
// (offline, or the Network permission revoked on GrapheneOS).
object OpenMeteo {

    data class Forecast(
        val tempC: Double,
        val humidity: Int,
        val windKmh: Double,
        val windDirection: Int,
        val code: Int, // WMO weather code
        val days: List<Day>, // today first
        val hours: List<Hour>,
    )

    data class Day(val minC: Double, val maxC: Double, val code: Int, val sunrise: Long, val sunset: Long, val rainChance: Int)
    data class Hour(val time: Long, val tempC: Double, val code: Int)

    fun fetch(latitude: Double, longitude: Double): Forecast? = try {
        val url = URL(
            "https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude" +
                "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m" +
                "&hourly=temperature_2m,weather_code" +
                "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max" +
                "&timezone=auto&timeformat=unixtime&forecast_days=7",
        )
        val conn = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 10_000
        }
        try {
            parse(JSONObject(conn.inputStream.bufferedReader().readText()))
        } finally {
            conn.disconnect()
        }
    } catch (e: Exception) {
        // No network, permission revoked, or a bad response: carry on without weather
        null
    }

    private fun parse(json: JSONObject): Forecast {
        val current = json.getJSONObject("current")
        val daily = json.getJSONObject("daily")
        val hourly = json.getJSONObject("hourly")
        val now = System.currentTimeMillis() / 1000

        val days = (0 until daily.getJSONArray("time").length()).map { i ->
            Day(
                minC = daily.getJSONArray("temperature_2m_min").getDouble(i),
                maxC = daily.getJSONArray("temperature_2m_max").getDouble(i),
                code = daily.getJSONArray("weather_code").getInt(i),
                sunrise = daily.getJSONArray("sunrise").getLong(i),
                sunset = daily.getJSONArray("sunset").getLong(i),
                rainChance = daily.getJSONArray("precipitation_probability_max").optInt(i, 0),
            )
        }
        val times = hourly.getJSONArray("time")
        val hours = (0 until times.length())
            .filter { times.getLong(it) >= now - 3600 }
            .take(24)
            .map { Hour(times.getLong(it), hourly.getJSONArray("temperature_2m").getDouble(it), hourly.getJSONArray("weather_code").getInt(it)) }

        return Forecast(
            tempC = current.getDouble("temperature_2m"),
            humidity = current.getInt("relative_humidity_2m"),
            windKmh = current.getDouble("wind_speed_10m"),
            windDirection = current.getInt("wind_direction_10m"),
            code = current.getInt("weather_code"),
            days = days,
            hours = hours,
        )
    }

    // Gadgetbridge expects Kelvin and OpenWeatherMap condition codes
    fun kelvin(c: Double) = (c + 273.15).roundToInt()

    fun owmCode(wmo: Int) = when (wmo) {
        0 -> 800
        1 -> 801
        2 -> 802
        3 -> 804
        45, 48 -> 741
        51 -> 300
        53 -> 301
        55 -> 302
        56, 57 -> 611
        61 -> 500
        63 -> 501
        65 -> 502
        66, 67 -> 511
        71, 77 -> 600
        73 -> 601
        75 -> 602
        80 -> 520
        81 -> 521
        82 -> 522
        85 -> 620
        86 -> 621
        95 -> 211
        96, 99 -> 202
        else -> 800
    }

    fun description(wmo: Int) = when (wmo) {
        0 -> "Clear"
        1, 2 -> "Partly cloudy"
        3 -> "Overcast"
        45, 48 -> "Fog"
        in 51..57 -> "Drizzle"
        in 61..67, in 80..82 -> "Rain"
        in 71..77, 85, 86 -> "Snow"
        else -> "Thunderstorm"
    }

    // Keep the raw forecast as JSON so the last one can be reused when offline
    fun toJson(f: Forecast): String = JSONObject()
        .put("tempC", f.tempC).put("humidity", f.humidity).put("windKmh", f.windKmh)
        .put("windDirection", f.windDirection).put("code", f.code)
        .put("days", JSONArray(f.days.map { JSONObject().put("minC", it.minC).put("maxC", it.maxC).put("code", it.code).put("sunrise", it.sunrise).put("sunset", it.sunset).put("rainChance", it.rainChance) }))
        .put("hours", JSONArray(f.hours.map { JSONObject().put("time", it.time).put("tempC", it.tempC).put("code", it.code) }))
        .toString()

    fun fromJson(s: String): Forecast? = try {
        val j = JSONObject(s)
        val days = j.getJSONArray("days")
        val hours = j.getJSONArray("hours")
        Forecast(
            tempC = j.getDouble("tempC"), humidity = j.getInt("humidity"), windKmh = j.getDouble("windKmh"),
            windDirection = j.getInt("windDirection"), code = j.getInt("code"),
            days = (0 until days.length()).map { days.getJSONObject(it) }.map { Day(it.getDouble("minC"), it.getDouble("maxC"), it.getInt("code"), it.getLong("sunrise"), it.getLong("sunset"), it.getInt("rainChance")) },
            hours = (0 until hours.length()).map { hours.getJSONObject(it) }.map { Hour(it.getLong("time"), it.getDouble("tempC"), it.getInt("code")) },
        )
    } catch (e: Exception) {
        null
    }
}
