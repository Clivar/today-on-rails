package app.todayonrails.agenda

import app.todayonrails.calendar.Event
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import java.time.LocalDate
import java.time.LocalDateTime

// Phone half of the parity tests: every case in tests/parity/cases.json must build exactly its `text`.
// The watch half (tests/parity/parity.test.mjs) parses the same `text` and checks what the face sees.
class AgendaParityTest {
    private val cases = JSONObject(File(System.getProperty("parity.cases")!!).readText()).getJSONArray("cases")

    @Test
    fun `every parity case builds its agenda text`() {
        for (i in 0 until cases.length()) {
            val c = cases.getJSONObject(i)
            val s = c.getJSONObject("settings")
            val settings = WatchSettings(
                nextMinutes = s.getInt("nextMinutes"),
                todayCardBefore = s.getInt("todayCardBefore"),
                todayCardDuring = s.getBoolean("todayCardDuring"),
                getReadyMinutes = s.getInt("getReadyMinutes"),
                buzzAtStart = s.getBoolean("buzzAtStart"),
                buzzBeforeEnd = s.getBoolean("buzzBeforeEnd"),
                buzzGetReady = s.getBoolean("buzzGetReady"),
            )
            val json = c.getJSONArray("events")
            val events = (0 until json.length()).map { json.getJSONObject(it) }.map {
                Event(LocalDateTime.parse(it.getString("start")), LocalDateTime.parse(it.getString("end")),
                    it.getString("title"), it.optString("place").ifEmpty { null })
            }
            val text = AgendaText.build(c.getString("city"), LocalDate.parse(c.getString("today")), events, settings, c.getBoolean("weather"))
            assertEquals(c.getString("name"), c.getString("text"), text)
        }
    }
}
