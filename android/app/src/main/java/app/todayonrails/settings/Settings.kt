package app.todayonrails.settings

import android.content.Context

// Everything the user can choose, plus a little state from the last sync (SharedPreferences).
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("today_on_rails", Context.MODE_PRIVATE)

    // ── Watchface layouts ──────────────────────────────────────────────────────

    // Minutes before an event when the watch switches from the big clock to the "next" layout
    var nextMinutes: Int
        get() = prefs.getInt("next_minutes", DEFAULT_NEXT)
        set(v) = prefs.edit().putInt("next_minutes", v).apply()

    // Show the Today card while an event is ongoing
    var todayCardDuring: Boolean
        get() = prefs.getBoolean("today_card_during", true)
        set(v) = prefs.edit().putBoolean("today_card_during", v).apply()

    // Minutes before an event when the Today card appears (0 = off)
    var todayCardBefore: Int
        get() = prefs.getInt("today_card_before", DEFAULT_TODAY_CARD_BEFORE)
        set(v) = prefs.edit().putInt("today_card_before", v).apply()

    // The green rail from now to the event: drawn only when the event (its end while it's on)
    // is at most this many minutes away; a shorter rail saves the watch's battery
    var railMinutes: Int
        get() = prefs.getInt("rail_minutes", DEFAULT_RAIL)
        set(v) = prefs.edit().putInt("rail_minutes", v).apply()

    // ── Nudges: the watch buzzes itself at these moments ───────────────────────

    // Buzz when an event starts
    var buzzAtStart: Boolean
        get() = prefs.getBoolean("buzz_start", true)
        set(v) = prefs.edit().putBoolean("buzz_start", v).apply()

    // Buzz 5 minutes before an event ends
    var buzzBeforeEnd: Boolean
        get() = prefs.getBoolean("buzz_end", true)
        set(v) = prefs.edit().putBoolean("buzz_end", v).apply()

    // Events with a place: show a "get ready" Today card earlier, so there's time to get going
    var getReadyEnabled: Boolean
        get() = prefs.getBoolean("get_ready", false)
        set(v) = prefs.edit().putBoolean("get_ready", v).apply()

    // ...this many minutes before the event
    var getReadyMinutes: Int
        get() = prefs.getInt("get_ready_minutes", DEFAULT_GET_READY)
        set(v) = prefs.edit().putInt("get_ready_minutes", v).apply()

    // ...with a buzz when it appears
    var buzzGetReady: Boolean
        get() = prefs.getBoolean("buzz_get_ready", true)
        set(v) = prefs.edit().putBoolean("buzz_get_ready", v).apply()

    // ── Calendars ──────────────────────────────────────────────────────────────

    // Selected calendar IDs; null = all visible Google calendars
    var calendarIds: Set<Long>?
        get() = prefs.getStringSet("calendars", null)?.mapNotNull { it.toLongOrNull() }?.toSet()
        set(v) = prefs.edit().putStringSet("calendars", v?.map { it.toString() }?.toSet()).apply()

    // ── Weather ────────────────────────────────────────────────────────────────

    // Fetch the forecast over the internet (otherwise the watchface hides the weather)
    var weatherEnabled: Boolean
        get() = prefs.getBoolean("weather", true)
        set(v) = prefs.edit().putBoolean("weather", v).apply()

    // Shown first in the weather location name, and used for the forecast
    var city: String
        get() = prefs.getString("city", "Brussels")!!
        set(v) = prefs.edit().putString("city", v).apply()

    var latitude: Double
        get() = prefs.getString("lat", "50.85")!!.toDoubleOrNull() ?: 50.85
        set(v) = prefs.edit().putString("lat", v.toString()).apply()

    var longitude: Double
        get() = prefs.getString("lon", "4.35")!!.toDoubleOrNull() ?: 4.35
        set(v) = prefs.edit().putString("lon", v.toString()).apply()

    // ── State ──────────────────────────────────────────────────────────────────

    var cachedWeather: String?
        get() = prefs.getString("weather_json", null)
        set(v) = prefs.edit().putString("weather_json", v).apply()

    var cachedWeatherAt: Long
        get() = prefs.getLong("weather_at", 0)
        set(v) = prefs.edit().putLong("weather_at", v).apply()

    // What was sent last, so identical updates can be skipped
    var lastSentHash: Int
        get() = prefs.getInt("last_sent_hash", 0)
        set(v) = prefs.edit().putInt("last_sent_hash", v).apply()

    var lastSentAt: Long
        get() = prefs.getLong("last_sent_at", 0)
        set(v) = prefs.edit().putLong("last_sent_at", v).apply()

    // Shown on the main screen
    var lastSync: String
        get() = prefs.getString("last_sync", "")!!
        set(v) = prefs.edit().putString("last_sync", v).apply()

    var lastAgenda: String
        get() = prefs.getString("last_agenda", "")!!
        set(v) = prefs.edit().putString("last_agenda", v).apply()

    companion object {
        // Defaults of the dropdowns, in minutes (shown as "(default)" in the app)
        const val DEFAULT_NEXT = 360
        const val DEFAULT_TODAY_CARD_BEFORE = 30
        const val DEFAULT_RAIL = 180
        const val DEFAULT_GET_READY = 60
    }
}
