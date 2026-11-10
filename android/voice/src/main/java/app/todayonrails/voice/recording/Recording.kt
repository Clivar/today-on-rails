package app.todayonrails.voice.recording

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream

// One voice session from the watch: the Opus packets as Gadgetbridge forwarded them, and when it
// started (the moment that decides which calendar event the note belongs to).
class Recording(val startedAt: Long, val packets: List<ByteArray>) {

    fun writeTo(out: OutputStream) {
        val data = DataOutputStream(out)
        data.writeInt(MAGIC)
        data.writeInt(VERSION)
        data.writeLong(startedAt)
        data.writeInt(packets.size)
        for (packet in packets) {
            data.writeShort(packet.size)
            data.write(packet)
        }
        data.flush()
    }

    companion object {
        private const val MAGIC = 0x544F5256 // "TORV"
        private const val VERSION = 1
        private const val MAX_PACKET = 0xFFFF

        fun readFrom(input: InputStream): Recording {
            val data = DataInputStream(input)
            if (data.readInt() != MAGIC) throw IOException("Not a recording")
            val version = data.readInt()
            if (version != VERSION) throw IOException("Unknown recording version $version")
            val startedAt = data.readLong()
            val count = data.readInt()
            if (count < 0) throw IOException("Bad packet count $count")
            val packets = ArrayList<ByteArray>(count)
            repeat(count) {
                val packet = ByteArray(data.readUnsignedShort())
                data.readFully(packet)
                packets += packet
            }
            return Recording(startedAt, packets)
        }

        // Gadgetbridge sends one packet per message; anything this large isn't a voice packet
        fun isPlausiblePacket(packet: ByteArray?) = packet != null && packet.isNotEmpty() && packet.size <= MAX_PACKET
    }
}
