package app.todayonrails.voice.audio

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class OpusTest {
    private fun toc(config: Int, code: Int) = ((config shl 3) or code).toByte()

    @Test
    fun durationFromTheTocByte() {
        // SILK wideband 20 ms (config 9), one frame: what a 16 kHz voice stream typically uses
        assertEquals(20_000L, Opus.durationUs(byteArrayOf(toc(9, 0), 1, 2)))
        // SILK 60 ms
        assertEquals(60_000L, Opus.durationUs(byteArrayOf(toc(11, 0))))
        // Hybrid 10 ms, two frames (code 1 and 2)
        assertEquals(20_000L, Opus.durationUs(byteArrayOf(toc(12, 1))))
        assertEquals(20_000L, Opus.durationUs(byteArrayOf(toc(14, 2))))
        // CELT 2.5 ms
        assertEquals(2_500L, Opus.durationUs(byteArrayOf(toc(16, 0))))
        // Code 3: frame count in the second byte (low 6 bits), here 3 × 20 ms CELT
        assertEquals(60_000L, Opus.durationUs(byteArrayOf(toc(31, 3), 0b1100_0011.toByte())))
    }

    @Test
    fun malformedPacketsHaveNoDuration() {
        assertEquals(0L, Opus.durationUs(byteArrayOf()))
        assertEquals(0L, Opus.durationUs(byteArrayOf(toc(31, 3)))) // code 3 without its count byte
    }

    @Test
    fun opusHeadForMono16kHz() {
        val head = Opus.head(channels = 1, inputSampleRate = 16_000)
        val expected = "OpusHead".toByteArray() + byteArrayOf(
            1,                      // version
            1,                      // channels
            0, 0,                   // pre-skip
            0x80.toByte(), 0x3E, 0, 0, // 16000 little-endian
            0, 0,                   // gain
            0,                      // mapping family
        )
        assertArrayEquals(expected, head)
    }
}
