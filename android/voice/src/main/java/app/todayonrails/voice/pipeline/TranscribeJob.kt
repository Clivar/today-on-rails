package app.todayonrails.voice.pipeline

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.util.Log

// Transcribes the waiting recordings in the background, after the watch already got its answer.
// A job rather than a thread: once Gadgetbridge unbinds, Android freezes our process, but a running job
// keeps it awake (wakelock) until it's done, and a stopped job is run again later.
class TranscribeJob : JobService() {
    override fun onStartJob(params: JobParameters): Boolean {
        Pipeline.processPending(this, onDone = { jobFinished(params, false) })
        return true
    }

    // Stopped by the system: the recordings are still on disk, run again later
    override fun onStopJob(params: JobParameters) = true

    companion object {
        private const val TAG = "TranscribeJob"
        private const val ID = 1

        // Expedited: starts right away, like work the user is waiting for. Out of expedited quota (many
        // notes in a short time), it becomes a normal job that runs within a few minutes.
        fun schedule(context: Context) {
            val scheduler = context.getSystemService(JobScheduler::class.java)
            val component = ComponentName(context, TranscribeJob::class.java)
            val expedited = JobInfo.Builder(ID, component).setExpedited(true).build()
            if (scheduler.schedule(expedited) == JobScheduler.RESULT_SUCCESS) return
            Log.w(TAG, "Expedited job refused, scheduling a normal one")
            scheduler.schedule(JobInfo.Builder(ID, component).setOverrideDeadline(5 * 60_000).build())
        }
    }
}
