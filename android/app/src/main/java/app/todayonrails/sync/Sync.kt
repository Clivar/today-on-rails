package app.todayonrails.sync

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import app.todayonrails.agenda.AgendaText
import app.todayonrails.agenda.WatchSettings
import app.todayonrails.calendar.CalendarReader
import app.todayonrails.gadgetbridge.Gadgetbridge
import app.todayonrails.settings.Settings
import app.todayonrails.weather.OpenMeteo
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

// Why a sync runs; decides whether it may use the network.
enum class Reason(val mayFetchWeather: Boolean) {
    MANUAL(true), // "Send now" or a settings change
    HOURLY(true), // the periodic job: weather refresh + calendar look-ahead
    CALENDAR_CHANGED(false), // battery: calendar changes never touch the network
    CLOCK_CHANGED(true), // time zone or clock changed
}

// One sync: read the calendar, get the weather (if allowed), send both to Gadgetbridge.
// Blocking (may use the network): run it off the main thread.
object Sync {
    private const val DAYS_AHEAD = 7
    private const val WEATHER_FRESH_MS = 55 * 60 * 1000L // newer than this: no refetch
    private const val WEATHER_USABLE_MS = 6 * 60 * 60 * 1000L // older than this: send "no weather"
    private const val RESEND_AFTER_MS = 6 * 60 * 60 * 1000L // identical data: resend at most this often

    @Synchronized
    fun run(context: Context, reason: Reason) {
        val settings = Settings(context)
        if (context.checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            settings.lastSync = "${time()}: no calendar access"
            return
        }

        val reader = CalendarReader(context)
        val calendars = settings.calendarIds ?: reader.defaultCalendarIds()
        val events = reader.upcoming(calendars, DAYS_AHEAD)
        val (forecast, weatherNote) = weather(settings, reason)
        // Layouts and buzzes: the watch does the rest itself
        val watch = WatchSettings(
            nextMinutes = settings.nextMinutes,
            todayCardBefore = settings.todayCardBefore,
            todayCardDuring = settings.todayCardDuring,
            getReadyMinutes = if (settings.getReadyEnabled) settings.getReadyMinutes else 0,
            buzzAtStart = settings.buzzAtStart,
            buzzBeforeEnd = settings.buzzBeforeEnd,
            buzzGetReady = settings.buzzGetReady,
            railMinutes = settings.railMinutes,
        )
        val agenda = AgendaText.build(settings.city, LocalDate.now(), events, watch, withWeather = forecast != null)
        settings.lastAgenda = agenda

        // Skip identical updates: saves Bluetooth traffic and work on the watch
        val hash = agenda.hashCode() * 31 + settings.cachedWeatherAt.hashCode()
        val recent = System.currentTimeMillis() - settings.lastSentAt < RESEND_AFTER_MS
        if (reason != Reason.MANUAL && hash == settings.lastSentHash && recent) {
            settings.lastSync = "${time()}: no changes"
            return
        }

        val sent = Gadgetbridge.sendWeather(context, agenda, settings.latitude, settings.longitude, forecast)
        if (!sent) {
            settings.lastSync = "${time()}: Gadgetbridge is not installed"
            return
        }
        settings.lastSentHash = hash
        settings.lastSentAt = System.currentTimeMillis()
        settings.lastSync = "${time()}: ${events.size} events, $weatherNote"
    }

    // The forecast to send, or null for "no weather"; plus a note for the status line
    private fun weather(settings: Settings, reason: Reason): Pair<OpenMeteo.Forecast?, String> {
        if (!settings.weatherEnabled) return null to "weather off"
        val age = System.currentTimeMillis() - settings.cachedWeatherAt
        val cached = { settings.cachedWeather?.let(OpenMeteo::fromJson) }

        if (age < WEATHER_FRESH_MS) cached()?.let { return it to "weather up to date" }
        if (reason.mayFetchWeather) {
            OpenMeteo.fetch(settings.latitude, settings.longitude)?.let {
                settings.cachedWeather = OpenMeteo.toJson(it)
                settings.cachedWeatherAt = System.currentTimeMillis()
                return it to "weather updated"
            }
        }
        if (age < WEATHER_USABLE_MS) cached()?.let { return it to "weather from cache" }
        return null to if (reason.mayFetchWeather) "no network: weather hidden" else "weather hidden until the next hourly update"
    }

    private fun time() = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
}
