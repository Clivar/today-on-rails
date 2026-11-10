package app.todayonrails.voice.transcribe

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TranscriptTest {
    @Test
    fun segmentsAreJoinedAndTrimmed() {
        assertEquals("Ask Jan about the budget. And book the room.", Transcript.clean(" Ask Jan about the budget.\n And book the room. "))
    }

    @Test
    fun soundDescriptionsAreDropped() {
        assertEquals("", Transcript.clean("[BLANK_AUDIO]"))
        assertEquals("", Transcript.clean(" [ Silence ]\n(music)\n*coughs*"))
        assertEquals("Call mum", Transcript.clean("[BLANK_AUDIO]\n Call mum"))
    }

    @Test
    fun bracketsInsideSpeechStay() {
        assertEquals("Order the cable (the long one)", Transcript.clean(" Order the cable (the long one)"))
    }

    @Test
    fun nothingIsEmpty() {
        assertEquals("", Transcript.clean(null))
        assertEquals("", Transcript.clean("\n \n"))
    }

    @Test
    fun promptIsTheTitleTidied() {
        assertEquals("Team call · Q3 roadmap", Transcript.prompt("  Team call ·\n Q3 roadmap "))
        assertNull(Transcript.prompt(null))
        assertNull(Transcript.prompt("   "))
        assertEquals(300, Transcript.prompt("x".repeat(1000))!!.length)
    }
}
