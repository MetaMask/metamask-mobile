package io.metamask.nativeModules.PerfSession

import android.app.Activity
import android.graphics.Rect
import android.os.Build
import android.view.KeyboardShortcutGroup
import android.view.Menu
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.Window
import androidx.annotation.RequiresApi

/**
 * Taps and scrolls for the `interactions` feature. Observes touches through a
 * Window.Callback wrapper (main thread only) without consuming or changing them,
 * and names the touched view by its React Native testID (falling back to the
 * accessibility label). Hit-testing runs once per gesture.
 */
internal object PerfInteractions {
    /** Set from the sampler thread; read on the main thread for every touch. */
    @Volatile
    var enabled = false

    /** Main thread only. Idempotent per window. */
    fun attach(activity: Activity) {
        val window = activity.window ?: return
        val callback = window.callback ?: return
        if (callback is TouchObserver) return
        window.callback = TouchObserver(callback, window, ViewConfiguration.get(activity).scaledTouchSlop)
    }

    private class TouchObserver(
        private val delegate: Window.Callback,
        private val window: Window,
        private val touchSlop: Int,
    ) : Window.Callback by delegate {
        private var downX = 0f
        private var downY = 0f
        private var scrolling = false
        private var scrollTarget: String? = null

        override fun dispatchTouchEvent(event: MotionEvent): Boolean {
            if (enabled) runCatching { observe(event) }
            return delegate.dispatchTouchEvent(event)
        }

        // Kotlin's `by` delegation skips Java default methods; forward them explicitly.
        override fun onProvideKeyboardShortcuts(data: MutableList<KeyboardShortcutGroup>?, menu: Menu?, deviceId: Int) =
            delegate.onProvideKeyboardShortcuts(data, menu, deviceId)

        @RequiresApi(Build.VERSION_CODES.O)
        override fun onPointerCaptureChanged(hasCapture: Boolean) = delegate.onPointerCaptureChanged(hasCapture)

        private fun observe(event: MotionEvent) {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.rawX
                    downY = event.rawY
                    scrolling = false
                    scrollTarget = null
                }
                MotionEvent.ACTION_MOVE -> {
                    if (!scrolling && (Math.abs(event.rawX - downX) > touchSlop || Math.abs(event.rawY - downY) > touchSlop)) {
                        scrolling = true
                        scrollTarget = nameAt(downX, downY)
                        report("scrollStart", scrollTarget)
                    }
                }
                MotionEvent.ACTION_UP -> {
                    if (scrolling) report("scrollEnd", scrollTarget)
                    else report("tap", nameAt(event.rawX, event.rawY))
                    scrolling = false
                }
                MotionEvent.ACTION_CANCEL -> {
                    if (scrolling) report("scrollEnd", scrollTarget)
                    scrolling = false
                }
            }
        }

        private fun report(type: String, value: String?) {
            PerfSession.onInteraction(type, value, System.currentTimeMillis(), PerfSession.monoUs())
        }

        /** testID (or accessibility label) of the deepest named view under the point. */
        private fun nameAt(x: Float, y: Float): String? {
            var view: View? = deepestViewAt(window.decorView, x.toInt(), y.toInt())
            while (view != null) {
                val testId = view.getTag(com.facebook.react.R.id.react_test_id) as? String
                val name = PerfSanitize.text(testId, 100) ?: PerfSanitize.text(view.contentDescription?.toString(), 100)
                if (name != null) return name
                view = view.parent as? View
            }
            return null
        }

        private val rect = Rect()

        private fun deepestViewAt(root: View, x: Int, y: Int): View? {
            if (root.visibility != View.VISIBLE || !root.getGlobalVisibleRect(rect) || !rect.contains(x, y)) return null
            if (root is ViewGroup) {
                // Later children draw on top, so search them first.
                for (i in root.childCount - 1 downTo 0) {
                    deepestViewAt(root.getChildAt(i), x, y)?.let { return it }
                }
            }
            return root
        }
    }
}
