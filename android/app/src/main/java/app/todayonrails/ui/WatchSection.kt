package app.todayonrails.ui

import android.app.Activity
import android.view.Gravity
import android.view.View
import android.widget.AdapterView
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.Switch
import android.widget.TextView
import app.todayonrails.R
import app.todayonrails.settings.Settings

// The three watchface layouts (with a small drawing of each) and when the watch shows them.
class WatchSection(private val activity: Activity, private val settings: Settings, private val onChanged: () -> Unit) {
    private val nextMinutes = activity.findViewById<Spinner>(R.id.nextMinutes)
    private val todayCardDuring = activity.findViewById<Switch>(R.id.todayCardDuring)
    private val todayCardBefore = activity.findViewById<Spinner>(R.id.todayCardBefore)
    private val railMinutes = activity.findViewById<Spinner>(R.id.railMinutes)

    private val clockFace = Face(FacePreview.Layout.CLOCK, R.string.face_clock)
    private val nextFace = Face(FacePreview.Layout.NEXT, R.string.face_next)
    private val todayCardFace = Face(FacePreview.Layout.TODAY_CARD, R.string.face_today_card)

    init {
        val faces = activity.findViewById<LinearLayout>(R.id.faces)
        listOf(clockFace, nextFace, todayCardFace).forEach { faces.addView(it.view) }

        bind(nextMinutes, R.array.next_choices, NEXT_CHOICES, Settings.DEFAULT_NEXT, settings.nextMinutes) { settings.nextMinutes = it }
        bind(todayCardBefore, R.array.today_card_before_choices, BEFORE_CHOICES, Settings.DEFAULT_TODAY_CARD_BEFORE, settings.todayCardBefore) {
            settings.todayCardBefore = it
        }
        bind(railMinutes, R.array.rail_choices, RAIL_CHOICES, Settings.DEFAULT_RAIL, settings.railMinutes) { settings.railMinutes = it }
        todayCardDuring.isChecked = settings.todayCardDuring
        todayCardDuring.setOnCheckedChangeListener { _, on ->
            settings.todayCardDuring = on
            changed()
        }
        showWhen()
    }

    private fun changed() {
        showWhen()
        onChanged()
    }

    // The caption under each drawing follows the settings, and the drawings show the green rail or not
    fun showWhen() {
        listOf(clockFace, nextFace, todayCardFace).forEach { it.setRail(settings.railMinutes) }
        clockFace.setWhen(activity.getString(R.string.face_clock_when), enabled = true)
        nextFace.setWhen(activity.getString(R.string.face_next_when, duration(settings.nextMinutes)), enabled = true)
        val before = settings.todayCardBefore
        val during = settings.todayCardDuring
        val text = when {
            during && before > 0 -> activity.getString(R.string.face_today_card_when_both, duration(before))
            during -> activity.getString(R.string.face_today_card_when_during)
            before > 0 -> activity.getString(R.string.face_today_card_when_before, duration(before))
            else -> activity.getString(R.string.face_today_card_when_off)
        }
        val ready = settings.getReadyEnabled
        val caption = if (ready) activity.getString(R.string.face_today_card_when_place, text, duration(settings.getReadyMinutes)) else text
        todayCardFace.setWhen(caption, enabled = during || before > 0 || ready)
    }

    // "15 min", "1 hour", "6 hours"
    private fun duration(minutes: Int): String = when {
        minutes < 60 -> "$minutes min"
        minutes == 60 -> "1 hour"
        minutes % 60 != 0 -> "${minutes / 60}½ hours"
        else -> "${minutes / 60} hours"
    }

    // A dropdown of labels backed by minute values; saves and reports a change when the user picks one
    private fun bind(spinner: Spinner, labels: Int, values: List<Int>, default: Int, current: Int, save: (Int) -> Unit) {
        spinner.adapter = choices(activity, labels, values, default)
        spinner.setSelection(values.indexOf(current).coerceAtLeast(0), false)
        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (values[position] == current && spinner.tag == null) return // initial selection
                spinner.tag = true
                save(values[position])
                changed()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    // One column: the drawing, the layout's name and when it shows
    private inner class Face(layout: FacePreview.Layout, name: Int) {
        private val preview = FacePreview(activity).apply {
            this.layout = layout
            contentDescription = activity.getString(name)
        }
        private val caption = TextView(activity).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            setTextColor(activity.getColor(R.color.muted))
            textSize = 13f
        }
        val view = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4), 0, dp(4), 0)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            addView(preview)
            addView(TextView(activity).apply {
                setText(name)
                gravity = Gravity.CENTER_HORIZONTAL
                setTextColor(activity.getColor(R.color.text))
                textSize = 15f
                setPadding(0, dp(8), 0, 0)
            })
            addView(caption)
        }

        fun setRail(minutes: Int) {
            preview.railMinutes = minutes
        }

        fun setWhen(text: String, enabled: Boolean) {
            caption.text = text
            view.alpha = if (enabled) 1f else 0.4f
        }
    }

    private fun dp(v: Int) = (v * activity.resources.displayMetrics.density).toInt()

    private companion object {
        // Minutes, matching the string arrays
        val NEXT_CHOICES = listOf(30, 60, 120, 180, 360, 720)
        val BEFORE_CHOICES = listOf(0, 5, 10, 15, 30, 60)
        val RAIL_CHOICES = listOf(30, 60, 180, 360, 720)
    }
}
