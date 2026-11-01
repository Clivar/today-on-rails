package app.todayonrails.sync

import android.app.job.JobParameters
import android.app.job.JobService

// Runs a sync in the background when one of the scheduled jobs fires.
class SyncJob : JobService() {
    override fun onStartJob(params: JobParameters): Boolean {
        val reason = when (params.jobId) {
            Scheduler.HOURLY -> Reason.HOURLY
            Scheduler.CALENDAR_CHANGED -> Reason.CALENDAR_CHANGED
            else -> Reason.CLOCK_CHANGED
        }
        Thread {
            try {
                Sync.run(applicationContext, reason)
            } finally {
                // A calendar-change trigger fires once: arm it again
                if (params.jobId == Scheduler.CALENDAR_CHANGED) Scheduler.watchCalendar(applicationContext)
                jobFinished(params, false)
            }
        }.start()
        return true
    }

    // Stopped by the system: don't retry, the next trigger will catch up
    override fun onStopJob(params: JobParameters) = false
}
