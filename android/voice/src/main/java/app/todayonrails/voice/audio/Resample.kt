package app.todayonrails.voice.audio

// Decoded audio: 16-bit samples, interleaved when there's more than one channel.
class Pcm(val samples: ShortArray, val sampleRate: Int, val channels: Int)

// Whisper wants 16 kHz mono floats in [-1, 1].
object Resample {
    const val WHISPER_RATE = 16_000

    fun forWhisper(pcm: Pcm): FloatArray {
        val mono = mono(pcm)
        val rate = pcm.sampleRate
        return when {
            rate == WHISPER_RATE -> FloatArray(mono.size) { mono[it] }
            // Android's Opus decoder outputs 48 kHz: average each group of 3. The watch records at
            // 16 kHz, so there's nothing above 8 kHz that could alias.
            rate % WHISPER_RATE == 0 -> {
                val k = rate / WHISPER_RATE
                FloatArray(mono.size / k) { i ->
                    var sum = 0f
                    for (j in 0 until k) sum += mono[i * k + j]
                    sum / k
                }
            }
            else -> linear(mono, rate)
        }
    }

    private fun mono(pcm: Pcm): FloatArray {
        val c = pcm.channels.coerceAtLeast(1)
        return FloatArray(pcm.samples.size / c) { i ->
            var sum = 0f
            for (j in 0 until c) sum += pcm.samples[i * c + j]
            sum / c / 32768f
        }
    }

    private fun linear(mono: FloatArray, rate: Int): FloatArray {
        if (mono.isEmpty()) return mono
        val n = (mono.size.toLong() * WHISPER_RATE / rate).toInt()
        return FloatArray(n) { i ->
            val pos = i.toDouble() * rate / WHISPER_RATE
            val a = pos.toInt().coerceAtMost(mono.size - 1)
            val b = (a + 1).coerceAtMost(mono.size - 1)
            val t = (pos - a).toFloat()
            mono[a] * (1 - t) + mono[b] * t
        }
    }
}
