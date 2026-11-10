package app.todayonrails.voice.transcribe

import android.content.res.AssetManager

// whisper.cpp through libvoice.so (src/main/cpp). One instance holds the loaded model (a few hundred
// MB of memory): load it for a recording and close it right after.
class Whisper private constructor(private var ctx: Long) : AutoCloseable {

    // 16 kHz mono samples → text. prompt: words to expect (the event title). language: "auto" or "en", …
    fun transcribe(samples: FloatArray, prompt: String?, language: String): String {
        check(ctx != 0L) { "Whisper is closed" }
        val bytes = nativeTranscribe(ctx, samples, prompt, language, threads()) ?: error("Transcription failed")
        return String(bytes, Charsets.UTF_8)
    }

    override fun close() {
        nativeFree(ctx)
        ctx = 0
    }

    companion object {
        init {
            System.loadLibrary("voice")
        }

        fun load(assets: AssetManager, modelAsset: String): Whisper {
            val ctx = nativeLoad(assets, modelAsset)
            check(ctx != 0L) { "Could not load the speech model" }
            return Whisper(ctx)
        }

        // The big cores: more threads than that only slows whisper.cpp down on phones
        private fun threads() = Runtime.getRuntime().availableProcessors().coerceIn(1, 4)

        @JvmStatic private external fun nativeLoad(assets: AssetManager, path: String): Long
        @JvmStatic private external fun nativeFree(ctx: Long)
        @JvmStatic private external fun nativeTranscribe(ctx: Long, samples: FloatArray, prompt: String?, language: String, threads: Int): ByteArray?
    }
}
