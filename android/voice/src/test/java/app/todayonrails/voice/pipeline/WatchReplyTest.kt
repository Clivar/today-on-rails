package app.todayonrails.voice.pipeline

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WatchReplyTest {
    @Test
    fun savedNamesTheEventItGoesTo() {
        val reply = WatchReply.saved(Destination("Team call", isNew = false))
        assertEquals(WatchReply("Saved", "Team call", "Transcribing on the phone", false), reply)
    }

    @Test
    fun savedNamesTheNewEvent() {
        assertEquals("New: Voice note", WatchReply.saved(Destination("Voice note", isNew = true)).subtitle)
    }

    @Test
    fun savedWithoutADestinationStillSaysSaved() {
        // No calendar access yet: the recording waits on the phone
        val reply = WatchReply.saved(null)
        assertEquals("Saved", reply.title)
        assertEquals("", reply.subtitle)
        assertFalse(reply.isError)
    }

    @Test
    fun errorsAreTextOnly() {
        val reply = WatchReply.error(WatchReply.NOTHING_RECORDED)
        assertTrue(reply.isError)
        assertEquals("Didn't catch that", reply.text)
    }
}
