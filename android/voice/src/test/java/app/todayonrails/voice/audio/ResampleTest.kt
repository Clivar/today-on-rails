package app.todayonrails.voice.audio

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

class ResampleTest {
    @Test
    fun sixteenKilohertzIsOnlyScaled() {
        val out = Resample.forWhisper(Pcm(shortArrayOf(0, 16384, -32768), 16_000, 1))
        assertArrayEquals(floatArrayOf(0f, 0.5f, -1f), out, 1e-6f)
    }

    @Test
    fun fortyEightKilohertzAveragesGroupsOfThree() {
        val out = Resample.forWhisper(Pcm(shortArrayOf(3, 6, 9, -3, -3, -3, 1), 48_000, 1))
        // The trailing sample that doesn't fill a group is dropped
        assertArrayEquals(floatArrayOf(6f / 32768, -3f / 32768), out, 1e-9f)
    }

    @Test
    fun stereoIsMixedToMono() {
        val out = Resample.forWhisper(Pcm(shortArrayOf(100, 300, -200, 0), 16_000, 2))
        assertArrayEquals(floatArrayOf(200f / 32768, -100f / 32768), out, 1e-9f)
    }

    @Test
    fun otherRatesKeepLengthAndShape() {
        // One second of a 440 Hz tone at 44.1 kHz → one second at 16 kHz, same tone
        val rate = 44_100
        val tone = ShortArray(rate) { (sin(2 * PI * 440 * it / rate) * 10_000).toInt().toShort() }
        val out = Resample.forWhisper(Pcm(tone, rate, 1))
        assertEquals(16_000, out.size)
        for (i in 0 until out.size step 997) {
            val expected = (sin(2 * PI * 440 * i / 16_000) * 10_000 / 32768).toFloat()
            assert(abs(out[i] - expected) < 0.01f) { "sample $i: ${out[i]} vs $expected" }
        }
    }

    @Test
    fun emptyStaysEmpty() {
        assertEquals(0, Resample.forWhisper(Pcm(ShortArray(0), 44_100, 1)).size)
        assertEquals(0, Resample.forWhisper(Pcm(ShortArray(0), 48_000, 1)).size)
    }
}
