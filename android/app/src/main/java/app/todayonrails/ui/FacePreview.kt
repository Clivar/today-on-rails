package app.todayonrails.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PathMeasure
import android.graphics.RectF
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View

// A simplified drawing of one watchface layout, in the watch's colours, so people can see what
// each setting turns on. Drawn on a 390 x 450 "watch" (the Bip 6 screen) and scaled to fit.
class FacePreview @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {

    enum class Layout { CLOCK, NEXT, TODAY_CARD }

    var layout = Layout.CLOCK
        set(value) {
            field = value
            invalidate()
        }

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val digits = Typeface.create("sans-serif-condensed", Typeface.BOLD)
    // Reused while drawing (no allocations in onDraw)
    private val rect = RectF()
    private val segment = Path()

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val w = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(w, (w * H / W).toInt())
    }

    override fun onDraw(canvas: Canvas) {
        val s = width / W
        canvas.save()
        canvas.scale(s, s)
        // Watch body and screen
        rect.set(0f, 0f, W, H)
        fill(canvas, BODY) { it.drawRoundRect(rect, 96f, 96f, paint) }
        rect.set(10f, 10f, W - 10, H - 10)
        fill(canvas, BLACK) { it.drawRoundRect(rect, 86f, 86f, paint) }
        rail(canvas)
        when (layout) {
            Layout.CLOCK -> clock(canvas)
            Layout.NEXT -> next(canvas)
            Layout.TODAY_CARD -> todayCard(canvas)
        }
        canvas.restore()
    }

    // Big clock, "Free until …", the bottom row and the record button
    private fun clock(c: Canvas) {
        bar(c, 40f, 48f, 110f, 16f, MUTED) // date
        time(c, "10:47", 34f, 260f, 150f)
        dot(c, 46f, 296f, 6f, MUTED)
        bar(c, 62f, 288f, 190f, 16f, MUTED) // free until …
        bottomRow(c)
        nowDot(c, 1.6f)
    }

    // Smaller clock, the event, a lime arc from now to it
    private fun next(c: Canvas) {
        bar(c, 40f, 48f, 110f, 16f, MUTED)
        time(c, "5:02", 34f, 222f, 140f)
        bar(c, 40f, 244f, 150f, 14f, LIME) // 6:00 PM · IN 58 MIN
        bar(c, 40f, 268f, 230f, 30f, TEXT) // title
        bar(c, 40f, 310f, 120f, 14f, MUTED) // +2 more today
        bottomRow(c)
        arc(c, 5f, 6f)
        nowDot(c, 5f)
        eventDot(c, 6f)
    }

    // The Today card: one event large, then what comes after it
    private fun todayCard(c: Canvas) {
        bar(c, 40f, 44f, 60f, 20f, MUTED) // small clock
        bar(c, 40f, 116f, 170f, 16f, LIME) // NOW · 25 MIN LEFT
        bar(c, 40f, 146f, 270f, 46f, TEXT) // big title, two lines
        bar(c, 40f, 200f, 190f, 46f, TEXT)
        bar(c, 40f, 260f, 150f, 24f, TEXT) // 9:00 – 10:30
        dot(c, 46f, 344f, 6f, MUTED)
        bar(c, 62f, 336f, 180f, 16f, TEXT)
        dot(c, 46f, 376f, 6f, TEXT)
        bar(c, 62f, 368f, 150f, 16f, TEXT)
        fill(c, LIME) { it.drawCircle(324f, 380f, 28f, paint) } // record
        arc(c, 9.5f, 10.5f)
        nowDot(c, 9.5f)
        eventDot(c, 10.5f)
    }

    private fun bottomRow(c: Canvas) {
        for (x in listOf(40f, 120f, 190f)) {
            dot(c, x + 8f, 380f, 8f, MUTED)
            bar(c, x + 22f, 372f, 34f, 16f, TEXT)
        }
        fill(c, LIME) { it.drawCircle(324f, 380f, 28f, paint) }
    }

    // ── The rail: a 12-hour clock around the edge ─────────────────────────────────

    private val railPath = Path().apply {
        // From 12 o'clock (top centre), clockwise, concentric with the screen corners
        val r = RectF(20f, 20f, W - 20, H - 20)
        moveTo(W / 2, r.top)
        addRoundRectFromTop(this, r, 76f)
    }
    private val measure = PathMeasure(railPath, false)

    private fun pointAt(hour: Float): FloatArray {
        val p = FloatArray(2)
        measure.getPosTan(measure.length * ((hour % 12) / 12f), p, null)
        return p
    }

    private fun rail(c: Canvas) {
        stroke(c, LINE, 3f) { it.drawPath(railPath, paint) }
    }

    private fun arc(c: Canvas, from: Float, to: Float) {
        segment.reset()
        measure.getSegment(measure.length * from / 12f, measure.length * to / 12f, segment, true)
        stroke(c, LIME, 10f) { it.drawPath(segment, paint) }
    }

    private fun nowDot(c: Canvas, hour: Float) = pointAt(hour).let { dot(c, it[0], it[1], 8f, TEXT) }
    private fun eventDot(c: Canvas, hour: Float) = pointAt(hour).let { dot(c, it[0], it[1], 11f, LIME) }

    // ── Primitives ────────────────────────────────────────────────────────────────

    private fun time(c: Canvas, t: String, x: Float, baseline: Float, size: Float) {
        paint.style = Paint.Style.FILL
        paint.typeface = digits
        paint.textSize = size
        val colon = t.indexOf(':')
        var cx = x
        for (i in t.indices) {
            paint.color = if (i == colon) LIME else TEXT
            c.drawText(t, i, i + 1, cx, baseline, paint)
            cx += paint.measureText(t, i, i + 1)
        }
    }

    private fun bar(c: Canvas, x: Float, y: Float, w: Float, h: Float, color: Int) {
        rect.set(x, y, x + w, y + h)
        fill(c, color) { it.drawRoundRect(rect, h / 2, h / 2, paint) }
    }

    private fun dot(c: Canvas, x: Float, y: Float, r: Float, color: Int) = fill(c, color) { it.drawCircle(x, y, r, paint) }

    private fun fill(c: Canvas, color: Int, draw: (Canvas) -> Unit) {
        paint.style = Paint.Style.FILL
        paint.color = color
        draw(c)
    }

    private fun stroke(c: Canvas, color: Int, width: Float, draw: (Canvas) -> Unit) {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = width
        paint.strokeCap = Paint.Cap.ROUND
        paint.color = color
        draw(c)
    }

    private companion object {
        const val W = 390f
        const val H = 450f
        const val BODY = 0xFF1D1E22.toInt()
        const val BLACK = 0xFF000000.toInt()
        const val TEXT = 0xFFF3F5EF.toInt()
        const val MUTED = 0xFF9EA39A.toInt()
        const val LINE = 0xFF2B2E2A.toInt()
        const val LIME = 0xFFB6F35A.toInt()

        // A rounded rectangle path that starts at the top centre and runs clockwise
        fun addRoundRectFromTop(p: Path, r: RectF, radius: Float) {
            p.lineTo(r.right - radius, r.top)
            p.arcTo(RectF(r.right - 2 * radius, r.top, r.right, r.top + 2 * radius), -90f, 90f)
            p.lineTo(r.right, r.bottom - radius)
            p.arcTo(RectF(r.right - 2 * radius, r.bottom - 2 * radius, r.right, r.bottom), 0f, 90f)
            p.lineTo(r.left + radius, r.bottom)
            p.arcTo(RectF(r.left, r.bottom - 2 * radius, r.left + 2 * radius, r.bottom), 90f, 90f)
            p.lineTo(r.left, r.top + radius)
            p.arcTo(RectF(r.left, r.top, r.left + 2 * radius, r.top + 2 * radius), 180f, 90f)
            p.close()
        }
    }
}
