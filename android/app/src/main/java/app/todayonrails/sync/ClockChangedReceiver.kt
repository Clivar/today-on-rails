package app.todayonrails.sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// The agenda uses local times: resend when the time zone or the clock changes.
class ClockChangedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED -> Scheduler.clockChanged(context)
        }
    }
}
