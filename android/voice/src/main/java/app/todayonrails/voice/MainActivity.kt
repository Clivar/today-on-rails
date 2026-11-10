package app.todayonrails.voice

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import app.todayonrails.voice.pipeline.Pipeline
import app.todayonrails.voice.settings.Settings
import app.todayonrails.voice.ui.CalendarsSection
import app.todayonrails.voice.ui.GadgetbridgeSection
import app.todayonrails.voice.ui.HistorySection
import app.todayonrails.voice.ui.LanguageSection
import app.todayonrails.voice.ui.StatusSection

// The app's only screen: setup and the recent notes. The work happens in VoiceService, called by
// Gadgetbridge; each part of this screen lives in ui/.
class MainActivity : Activity() {
    private lateinit var status: StatusSection
    private lateinit var calendars: CalendarsSection
    private lateinit var history: HistorySection

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val settings = Settings(this)
        status = StatusSection(this, ::hasCalendarAccess) { requestPermissions(CALENDAR_PERMISSIONS, REQUEST_CALENDAR) }
        GadgetbridgeSection(this)
        calendars = CalendarsSection(this, settings)
        LanguageSection(this, settings)
        history = HistorySection(this, settings)
    }

    override fun onResume() {
        super.onResume()
        show()
        // Recordings that waited for calendar access (or a calendar choice) go in now
        if (hasCalendarAccess() && Pipeline.store(this).pending().isNotEmpty()) {
            Pipeline.processPending(this, onDone = { runOnUiThread { if (!isDestroyed) show() } })
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        show()
    }

    private fun show() {
        val access = hasCalendarAccess()
        status.show()
        calendars.show(access)
        history.show()
    }

    private fun hasCalendarAccess() =
        CALENDAR_PERMISSIONS.all { checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }

    private companion object {
        const val REQUEST_CALENDAR = 1
        val CALENDAR_PERMISSIONS = arrayOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR)
    }
}
