package app.todayonrails

import android.Manifest
import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import app.todayonrails.settings.Settings
import app.todayonrails.sync.Reason
import app.todayonrails.sync.Scheduler
import app.todayonrails.sync.Sync
import app.todayonrails.ui.CalendarsSection
import app.todayonrails.ui.NudgesSection
import app.todayonrails.ui.StatusSection
import app.todayonrails.ui.WatchSection
import app.todayonrails.ui.WeatherSection

// The app's only screen. Each part lives in ui/; this class wires them together and runs syncs.
class MainActivity : Activity() {
    private lateinit var settings: Settings
    private lateinit var status: StatusSection
    private lateinit var calendars: CalendarsSection
    private lateinit var weather: WeatherSection
    private lateinit var watch: WatchSection
    private val handler = Handler(Looper.getMainLooper())
    private val sendSoon = Runnable { syncNow() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        settings = Settings(this)
        status = StatusSection(this, settings, ::requestCalendarAccess, ::syncNow)
        watch = WatchSection(this, settings, ::settingsChanged)
        NudgesSection(this, settings) {
            watch.showWhen() // the Today card's caption mentions "get ready"
            settingsChanged()
        }
        calendars = CalendarsSection(this, settings, ::settingsChanged)
        weather = WeatherSection(this, settings, ::settingsChanged)
    }

    override fun onResume() {
        super.onResume()
        val access = status.hasCalendarAccess()
        if (access) Scheduler.start(this)
        status.show()
        calendars.show(access)
        // First run (or nothing sent yet): send right away instead of waiting for the hourly update
        if (access && settings.lastSentAt == 0L) syncNow()
    }

    override fun onPause() {
        super.onPause()
        if (weather.save()) settingsChanged()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        if (requestCode == REQUEST_CALENDAR && status.hasCalendarAccess()) {
            Scheduler.start(this)
            calendars.show(true)
            syncNow()
        }
        status.show()
    }

    private fun requestCalendarAccess() = requestPermissions(arrayOf(Manifest.permission.READ_CALENDAR), REQUEST_CALENDAR)


    // Settings changed: send the new settings to the watch, once the user stops tapping
    private fun settingsChanged() {
        handler.removeCallbacks(sendSoon)
        handler.postDelayed(sendSoon, 1500)
    }

    private fun syncNow() {
        if (!status.hasCalendarAccess()) return
        weather.save()
        status.setBusy(true)
        val app = applicationContext
        Thread {
            Sync.run(app, Reason.MANUAL)
            runOnUiThread {
                if (!isDestroyed) {
                    status.setBusy(false)
                    status.show()
                }
            }
        }.start()
    }

    private companion object {
        const val REQUEST_CALENDAR = 1
    }
}
