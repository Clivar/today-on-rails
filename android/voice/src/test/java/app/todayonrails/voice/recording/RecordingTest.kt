package app.todayonrails.voice.recording

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException

class RecordingTest {
    @get:Rule val tmp = TemporaryFolder()

    private val packets = listOf(byteArrayOf(0x48, 1, 2), byteArrayOf(0x48), ByteArray(300) { it.toByte() })

    @Test
    fun roundTrip() {
        val out = ByteArrayOutputStream()
        Recording(1_762_700_000_000, packets).writeTo(out)
        val back = Recording.readFrom(ByteArrayInputStream(out.toByteArray()))
        assertEquals(1_762_700_000_000, back.startedAt)
        assertEquals(packets.size, back.packets.size)
        packets.indices.forEach { assertArrayEquals(packets[it], back.packets[it]) }
    }

    @Test(expected = IOException::class)
    fun rejectsOtherFiles() {
        Recording.readFrom(ByteArrayInputStream("not a recording at all".toByteArray()))
    }

    @Test(expected = IOException::class)
    fun rejectsTruncatedFiles() {
        val out = ByteArrayOutputStream()
        Recording(1, packets).writeTo(out)
        Recording.readFrom(ByteArrayInputStream(out.toByteArray().copyOf(out.size() - 10)))
    }

    @Test
    fun plausiblePackets() {
        assertTrue(Recording.isPlausiblePacket(byteArrayOf(1)))
        assertFalse(Recording.isPlausiblePacket(null))
        assertFalse(Recording.isPlausiblePacket(byteArrayOf()))
        assertFalse(Recording.isPlausiblePacket(ByteArray(70_000)))
    }

    @Test
    fun storeKeepsRecordingsOldestFirstUntilDeleted() {
        val store = RecordingStore(tmp.newFolder("recordings"))
        val later = store.save(Recording(2_000, packets))
        val earlier = store.save(Recording(1_000, packets))
        val sameMoment = store.save(Recording(1_000, packets.take(1)))
        assertEquals(listOf(earlier, sameMoment, later), store.pending())
        assertEquals(1, store.read(sameMoment).packets.size)

        store.delete(earlier)
        assertEquals(listOf(sameMoment, later), store.pending())
    }

    @Test
    fun halfWrittenFilesAreNotPending() {
        val dir = tmp.newFolder("recordings")
        dir.resolve("123.tmp").writeText("partial")
        assertEquals(emptyList<Any>(), RecordingStore(dir).pending())
    }
}
