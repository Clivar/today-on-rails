package app.todayonrails.voice.gadgetbridge

import android.content.Context
import android.content.pm.PackageManager

// Gadgetbridge's voice service API (ZeppOsVoiceServiceBridge; docs: "Assistant voice service" on
// gadgetbridge.org). Gadgetbridge binds with ACTION, sends one Opus packet per MSG_VOICE_DATA and
// MSG_VOICE_END when the watch stops recording, then waits 15 s for MSG_REPLY or MSG_ERROR
// ("No reply from voice service" after that; we answer at once).
object VoiceContract {
    const val ACTION = "nodomain.freeyourgadget.gadgetbridge.VOICE_COMMAND"

    const val MSG_VOICE_DATA = 0
    const val MSG_VOICE_END = 1
    const val MSG_REPLY = 100
    const val MSG_ERROR = 101

    const val EXTRA_VOICE_DATA = "VOICE_DATA"
    const val EXTRA_VOICE_ENCODING = "VOICE_ENCODING"
    const val EXTRA_TITLE = "TITLE"
    const val EXTRA_SUBTITLE = "SUBTITLE"
    const val EXTRA_TEXT = "TEXT"

    const val ENCODING_OPUS = "OPUS"

    // The Gadgetbridge builds allowed to send us voice
    val PACKAGES = listOf(
        "nodomain.freeyourgadget.gadgetbridge",
        "nodomain.freeyourgadget.gadgetbridge.nightly",
        "nodomain.freeyourgadget.gadgetbridge.nightly_nopebble",
        "com.espruino.gadgetbridge.banglejs",
    )

    // The service is exported (Gadgetbridge has to reach it): only accept messages from Gadgetbridge
    fun isGadgetbridge(context: Context, uid: Int): Boolean =
        context.packageManager.getPackagesForUid(uid).orEmpty().any { it in PACKAGES }

    fun installedPackage(context: Context): String? = PACKAGES.firstOrNull {
        try {
            context.packageManager.getPackageInfo(it, 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }
}
