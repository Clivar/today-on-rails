package app.todayonrails.voice.ui

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import app.todayonrails.voice.R
import app.todayonrails.voice.gadgetbridge.VoiceService

// The two values to enter in Gadgetbridge's Voice Assistant settings, with copy buttons. Taken from
// the code itself, so they can't drift from the real package and class.
class GadgetbridgeSection(private val activity: Activity) {
    init {
        val packageName = activity.packageName
        val className = VoiceService::class.java.name
        activity.findViewById<TextView>(R.id.servicePackage).text = packageName
        activity.findViewById<TextView>(R.id.serviceClass).text = className
        activity.findViewById<Button>(R.id.copyPackage).setOnClickListener { copy(packageName) }
        activity.findViewById<Button>(R.id.copyClass).setOnClickListener { copy(className) }
    }

    private fun copy(text: String) {
        activity.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText(text, text))
        Toast.makeText(activity, R.string.copied, Toast.LENGTH_SHORT).show()
    }
}
