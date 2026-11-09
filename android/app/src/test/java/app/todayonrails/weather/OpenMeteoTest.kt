package app.todayonrails.weather

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

// The forecast keeps both temperatures (air and feels-like); the phone sends the one chosen in the app.
class OpenMeteoTest {
    private val now = System.currentTimeMillis() / 1000

    // A reply shaped like Open-Meteo's, with the fields the app asks for
    private fun reply() = JSONObject()
        .put("current", JSONObject().put("temperature_2m", 7.0).put("apparent_temperature", 3.5)
            .put("relative_humidity_2m", 80).put("weather_code", 3).put("wind_speed_10m", 18.0).put("wind_direction_10m", 240))
        .put("hourly", JSONObject().put("time", JSONArray(listOf(now, now + 3600)))
            .put("temperature_2m", JSONArray(listOf(7.0, 6.0))).put("apparent_temperature", JSONArray(listOf(3.5, 2.0)))
            .put("weather_code", JSONArray(listOf(3, 61))))
        .put("daily", JSONObject().put("time", JSONArray(listOf(now)))
            .put("temperature_2m_min", JSONArray(listOf(2.0))).put("temperature_2m_max", JSONArray(listOf(9.0)))
            .put("apparent_temperature_min", JSONArray(listOf(-1.5))).put("apparent_temperature_max", JSONArray(listOf(6.5)))
            .put("weather_code", JSONArray(listOf(3))).put("sunrise", JSONArray(listOf(now))).put("sunset", JSONArray(listOf(now)))
            .put("precipitation_probability_max", JSONArray(listOf(40))))

    @Test
    fun `both temperatures are read, and feelsLike puts the feels-like ones in place`() {
        val f = OpenMeteo.parse(reply())
        assertEquals(listOf(7.0, 3.5), listOf(f.tempC, f.feelsC))
        val felt = OpenMeteo.feelsLike(f)
        assertEquals(3.5, felt.tempC, 0.0)
        assertEquals(listOf(-1.5, 6.5), listOf(felt.days[0].minC, felt.days[0].maxC))
        assertEquals(listOf(3.5, 2.0), felt.hours.map { it.tempC })
        assertEquals(f.hours.map { it.code }, felt.hours.map { it.code }) // nothing else changes
    }

    @Test
    fun `the cache keeps both temperatures`() {
        val f = OpenMeteo.parse(reply())
        assertEquals(f, OpenMeteo.fromJson(OpenMeteo.toJson(f)))
    }

    @Test
    fun `a forecast cached before feels-like existed reads it as the air temperature`() {
        val old = """{"tempC":7.0,"humidity":80,"windKmh":18.0,"windDirection":240,"code":3,
            "days":[{"minC":2.0,"maxC":9.0,"code":3,"sunrise":1,"sunset":2,"rainChance":40}],
            "hours":[{"time":1,"tempC":7.0,"code":3}]}"""
        val felt = OpenMeteo.feelsLike(OpenMeteo.fromJson(old)!!)
        assertEquals(listOf(7.0, 2.0, 9.0, 7.0), listOf(felt.tempC, felt.days[0].minC, felt.days[0].maxC, felt.hours[0].tempC))
    }
}
