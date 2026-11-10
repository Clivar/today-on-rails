package app.todayonrails.voice.gadgetbridge

import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import android.os.RemoteException
import android.util.Log
import app.todayonrails.voice.pipeline.Pipeline
import app.todayonrails.voice.pipeline.TranscribeJob
import app.todayonrails.voice.pipeline.WatchReply
import app.todayonrails.voice.recording.Recording

// What Gadgetbridge binds to while the watch's assistant (Zepp Flow) records. Collects the packets;
// when the watch stops, saves the recording, starts the background job that transcribes it into the
// calendar, and answers the watch right away ("Saved" + the event it goes to).
// Configure in Gadgetbridge: Device settings → Developer settings → Voice Assistant →
// package app.todayonrails.voice, class app.todayonrails.voice.gadgetbridge.VoiceService.
class VoiceService : Service() {
    private val main = Handler(Looper.getMainLooper())
    private val messenger = Messenger(Handler(Looper.getMainLooper(), ::handle))

    // The session being recorded
    private val packets = ArrayList<ByteArray>()
    private var startedAt = 0L
    private var replyTo: Messenger? = null

    override fun onBind(intent: Intent): IBinder? =
        if (intent.action == VoiceContract.ACTION) messenger.binder else null

    // Gadgetbridge unbinds after our reply, or when the session broke off: keep whatever was recorded
    override fun onUnbind(intent: Intent): Boolean {
        if (packets.isNotEmpty()) {
            Log.w(TAG, "Unbound before the recording ended: saving ${packets.size} packets")
            if (saveSession()) TranscribeJob.schedule(this)
        }
        return false
    }

    private fun handle(msg: Message): Boolean {
        if (!VoiceContract.isGadgetbridge(this, msg.sendingUid)) {
            Log.w(TAG, "Ignoring message from uid ${msg.sendingUid}")
            return true
        }
        msg.replyTo?.let { replyTo = it }
        when (msg.what) {
            VoiceContract.MSG_VOICE_DATA -> {
                val data = msg.data
                val packet = data.getByteArray(VoiceContract.EXTRA_VOICE_DATA)
                val encoding = data.getString(VoiceContract.EXTRA_VOICE_ENCODING)
                if (encoding != null && encoding != VoiceContract.ENCODING_OPUS) {
                    Log.w(TAG, "Unsupported encoding $encoding")
                } else if (Recording.isPlausiblePacket(packet)) {
                    if (packets.isEmpty()) startedAt = System.currentTimeMillis()
                    packets += packet!!
                }
            }
            VoiceContract.MSG_VOICE_END -> recordingEnded()
            else -> Log.w(TAG, "Unknown message ${msg.what}")
        }
        return true
    }

    private fun recordingEnded() {
        val reply = replyTo
        if (packets.isEmpty()) return send(reply, WatchReply.error(WatchReply.NOTHING_RECORDED))
        val at = startedAt
        if (!saveSession()) return send(reply, WatchReply.error(WatchReply.NOT_SAVED))
        TranscribeJob.schedule(this)
        // Which event it goes to: one calendar query, kept off the main thread (Gadgetbridge's messages)
        val app = applicationContext
        Thread {
            val destination = try {
                Pipeline.destination(app, at)
            } catch (e: Exception) {
                Log.w(TAG, "Couldn't look up the event", e)
                null
            }
            main.post { send(reply, WatchReply.saved(destination)) }
        }.start()
    }

    private fun saveSession(): Boolean = try {
        Pipeline.store(this).save(Recording(startedAt, ArrayList(packets)))
        true
    } catch (e: Exception) {
        Log.e(TAG, "Couldn't save the recording", e)
        false
    } finally {
        packets.clear()
    }

    private fun send(to: Messenger?, reply: WatchReply) {
        if (to == null) return
        val msg = Message.obtain(null, if (reply.isError) VoiceContract.MSG_ERROR else VoiceContract.MSG_REPLY)
        msg.data.putString(VoiceContract.EXTRA_TEXT, reply.text)
        if (!reply.isError) {
            msg.data.putString(VoiceContract.EXTRA_TITLE, reply.title)
            msg.data.putString(VoiceContract.EXTRA_SUBTITLE, reply.subtitle)
        }
        try {
            to.send(msg)
        } catch (e: RemoteException) {
            Log.w(TAG, "Gadgetbridge is gone, reply not shown", e)
        }
    }

    private companion object {
        const val TAG = "VoiceService"
    }
}
