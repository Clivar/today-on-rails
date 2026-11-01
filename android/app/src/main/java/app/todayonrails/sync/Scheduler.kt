package app.todayonrails.sync

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import android.provider.CalendarContract

// When to sync, as cheaply as possible:
//   - shortly after the calendar changes (content trigger; no polling, no network)
//   - once an hour, batched by the system (weather refresh + the 7-day look-ahead)
//   - right after the clock or time zone changes
// The watch only picks up new data on its own weather fetch (~30 min), so more often wouldn't help.
object Scheduler {
    const val HOURLY = 1
    const val CALENDAR_CHANGED = 2
    const val CLOCK_CHANGED = 3
    private const val HOUR_MS = 60 * 60 * 1000L
    private const val FLEX_MS = 20 * 60 * 1000L

    fun start(context: Context) {
        val hourly = JobInfo.Builder(HOURLY, component(context))
            .setPeriodic(HOUR_MS, FLEX_MS)
            .setPersisted(true) // survives reboots (RECEIVE_BOOT_COMPLETED)
            .build()
        // Re-scheduling an identical periodic job would restart its timer: only schedule when missing
        if (scheduler(context).getPendingJob(HOURLY) == null) scheduler(context).schedule(hourly)
        watchCalendar(context)
    }

    // One-shot job that runs when the calendar provider reports a change (re-armed after each run)
    fun watchCalendar(context: Context) {
        val job = JobInfo.Builder(CALENDAR_CHANGED, component(context))
            .addTriggerContentUri(JobInfo.TriggerContentUri(CalendarContract.CONTENT_URI, JobInfo.TriggerContentUri.FLAG_NOTIFY_FOR_DESCENDANTS))
            .setTriggerContentUpdateDelay(15_000) // wait for a burst of changes (a sync) to settle
            .setTriggerContentMaxDelay(2 * 60_000)
            .build()
        scheduler(context).schedule(job)
    }

    fun clockChanged(context: Context) {
        val job = JobInfo.Builder(CLOCK_CHANGED, component(context))
            .setOverrideDeadline(30_000)
            .build()
        scheduler(context).schedule(job)
    }

    private fun component(context: Context) = ComponentName(context, SyncJob::class.java)
    private fun scheduler(context: Context) = context.getSystemService(JobScheduler::class.java)
}
