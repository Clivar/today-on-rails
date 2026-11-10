package app.todayonrails.voice.recording

import java.io.File

// Recordings waiting to be transcribed, one file each in the app's private storage. A recording is
// saved before anything else happens and deleted once its note is in the calendar, so a crash or a
// killed process never loses what was said: the next run picks it up again.
class RecordingStore(private val dir: File) {

    fun save(recording: Recording): File {
        dir.mkdirs()
        // Written under a temporary name first: a half-written file never looks like a recording
        val tmp = File(dir, "${recording.startedAt}.tmp")
        tmp.outputStream().use { recording.writeTo(it) }
        val file = uniqueFile(recording.startedAt)
        if (!tmp.renameTo(file)) throw java.io.IOException("Could not save $file")
        return file
    }

    // Oldest first
    fun pending(): List<File> =
        dir.listFiles { f -> f.name.endsWith(EXTENSION) }.orEmpty().sortedBy { it.name.substringBefore('.').substringBefore('-').toLongOrNull() ?: 0 }

    fun read(file: File): Recording = file.inputStream().buffered().use { Recording.readFrom(it) }

    fun delete(file: File) {
        file.delete()
    }

    private fun uniqueFile(startedAt: Long): File {
        var file = File(dir, "$startedAt$EXTENSION")
        var n = 1
        while (file.exists()) file = File(dir, "$startedAt-${n++}$EXTENSION")
        return file
    }

    private companion object {
        const val EXTENSION = ".rec"
    }
}
