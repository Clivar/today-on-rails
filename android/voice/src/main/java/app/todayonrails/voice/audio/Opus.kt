package app.todayonrails.voice.audio

import java.nio.ByteBuffer
import java.nio.ByteOrder

// What the Opus decoder needs to know about the watch's packets (RFC 6716 / RFC 7845).
object Opus {
    // Gadgetbridge forwards the watch's voice as Opus packets, 16 kHz mono
    const val WATCH_SAMPLE_RATE = 16_000

    // Playing length of one packet in microseconds, from its TOC byte; 0 if the packet is malformed.
    fun durationUs(packet: ByteArray): Long {
        if (packet.isEmpty()) return 0
        val toc = packet[0].toInt() and 0xFF
        val config = toc shr 3
        val frameUs = when {
            config < 12 -> SILK_US[config % 4]   // SILK: 10, 20, 40, 60 ms
            config < 16 -> HYBRID_US[config % 2] // Hybrid: 10, 20 ms
            else -> CELT_US[config % 4]          // CELT: 2.5, 5, 10, 20 ms
        }
        val frames = when (toc and 0x03) {
            0 -> 1
            1, 2 -> 2
            else -> if (packet.size < 2) return 0 else packet[1].toInt() and 0x3F
        }
        return frames * frameUs
    }

    // The "OpusHead" identification header (RFC 7845 §5.1): what Android's decoder expects as csd-0.
    fun head(channels: Int, inputSampleRate: Int, preSkip: Int = 0): ByteArray =
        ByteBuffer.allocate(19).order(ByteOrder.LITTLE_ENDIAN).apply {
            put("OpusHead".toByteArray(Charsets.US_ASCII))
            put(1)                        // version
            put(channels.toByte())
            putShort(preSkip.toShort())
            putInt(inputSampleRate)
            putShort(0)                   // output gain
            put(0)                        // channel mapping family: mono/stereo
        }.array()

    private val SILK_US = longArrayOf(10_000, 20_000, 40_000, 60_000)
    private val HYBRID_US = longArrayOf(10_000, 20_000)
    private val CELT_US = longArrayOf(2_500, 5_000, 10_000, 20_000)
}
