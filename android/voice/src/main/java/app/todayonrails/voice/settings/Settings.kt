package app.todayonrails.voice.settings

import android.content.Context

// What the user chose, plus the recent notes shown in the app (SharedPreferences).
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("voice", Context.MODE_PRIVATE)

    // Calendars searched for the running event; null = every calendar
    var lookInCalendars: Set<Long>?
        get() = prefs.getStringSet("look_in", null)?.mapNotNull { it.toLongOrNull() }?.toSet()
        set(v) = prefs.edit().putStringSet("look_in", v?.map { it.toString() }?.toSet()).apply()

    // Where new events go ("Voice note", "Notes: …"); 0 = not chosen yet (the primary calendar is used)
    var newEventsCalendar: Long
        get() = prefs.getLong("new_events", 0)
        set(v) = prefs.edit().putLong("new_events", v).apply()

    // Whisper's language: "auto" detects it per note
    var language: String
        get() = prefs.getString("language", DEFAULT_LANGUAGE)!!
        set(v) = prefs.edit().putString("language", v).apply()

    // The latest notes, newest first, one per line (shown in the app; stays on the phone)
    var history: List<String>
        get() = prefs.getString("history", "")!!.lines().filter { it.isNotBlank() }
        set(v) = prefs.edit().putString("history", v.take(HISTORY_SIZE).joinToString("\n")).apply()

    @Synchronized
    fun addHistory(entry: String) {
        history = listOf(entry.replace('\n', ' ')) + history
    }

    companion object {
        const val DEFAULT_LANGUAGE = "auto"
        const val HISTORY_SIZE = 10
    }
}
