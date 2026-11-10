package app.todayonrails.voice.audio

import android.media.MediaCodec
import android.media.MediaFormat
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Decodes the watch's Opus packets with Android's own decoder (MediaCodec), so no codec library.
object OpusDecoder {
    private const val TIMEOUT_US = 10_000L
    private const val SEEK_PREROLL_NS = 80_000_000L // RFC 7845's recommended 80 ms
    private const val GIVE_UP_NS = 10_000_000_000L    // 14 s of voice decodes in well under a second

    fun decode(packets: List<ByteArray>): Pcm {
        // Android's decoder always runs at 48 kHz; the input rate goes in the OpusHead
        val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_OPUS, 48_000, 1).apply {
            setByteBuffer("csd-0", ByteBuffer.wrap(Opus.head(channels = 1, inputSampleRate = Opus.WATCH_SAMPLE_RATE)))
            setByteBuffer("csd-1", nanos(0))             // pre-skip
            setByteBuffer("csd-2", nanos(SEEK_PREROLL_NS))
        }
        val codec = MediaCodec.createDecoderByType(MediaFormat.MIMETYPE_AUDIO_OPUS)
        try {
            codec.configure(format, null, null, 0)
            codec.start()
            return run(codec, packets)
        } finally {
            codec.release()
        }
    }

    private fun run(codec: MediaCodec, packets: List<ByteArray>): Pcm {
        val out = ByteArrayOutputStream()
        val info = MediaCodec.BufferInfo()
        var rate = 48_000
        var channels = 1
        var next = 0
        var ptsUs = 0L
        var inputDone = false
        val giveUpAt = System.nanoTime() + GIVE_UP_NS
        while (true) {
            check(System.nanoTime() < giveUpAt) { "Opus decoder stalled" }
            if (!inputDone) {
                val index = codec.dequeueInputBuffer(TIMEOUT_US)
                if (index >= 0) {
                    if (next < packets.size) {
                        val packet = packets[next++]
                        codec.getInputBuffer(index)!!.apply { clear(); put(packet) }
                        codec.queueInputBuffer(index, 0, packet.size, ptsUs, 0)
                        ptsUs += Opus.durationUs(packet)
                    } else {
                        codec.queueInputBuffer(index, 0, 0, ptsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        inputDone = true
                    }
                }
            }
            val index = codec.dequeueOutputBuffer(info, TIMEOUT_US)
            when {
                index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> codec.outputFormat.let {
                    rate = it.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    channels = it.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                }
                index >= 0 -> {
                    val buffer = codec.getOutputBuffer(index)!!
                    val bytes = ByteArray(info.size)
                    buffer.position(info.offset)
                    buffer.get(bytes)
                    out.write(bytes)
                    codec.releaseOutputBuffer(index, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
                }
            }
        }
        val raw = ByteBuffer.wrap(out.toByteArray()).order(ByteOrder.nativeOrder()).asShortBuffer()
        val samples = ShortArray(raw.remaining()).also { raw.get(it) }
        return Pcm(samples, rate, channels)
    }

    private fun nanos(value: Long): ByteBuffer =
        ByteBuffer.allocate(8).order(ByteOrder.nativeOrder()).putLong(value).apply { flip() }
}
