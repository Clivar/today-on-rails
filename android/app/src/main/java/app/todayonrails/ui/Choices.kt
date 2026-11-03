package app.todayonrails.ui

import android.app.Activity
import android.widget.ArrayAdapter
import app.todayonrails.R

// The options of a dropdown, with "(default)" after the one the app starts with. The default comes
// from Settings, so the label can't drift from what the app really does.
fun choices(activity: Activity, labels: Int, values: List<Int>, default: Int): ArrayAdapter<String> {
    val items = activity.resources.getStringArray(labels).mapIndexed { i, label ->
        if (values[i] == default) activity.getString(R.string.choice_default, label) else label
    }
    return ArrayAdapter(activity, android.R.layout.simple_spinner_dropdown_item, items)
}
