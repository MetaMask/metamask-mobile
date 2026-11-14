package io.metamask.nativeModules.PerfSession

import android.app.Activity
import android.graphics.Rect
import android.graphics.drawable.Animatable
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.SurfaceView
import android.view.TextureView
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.ImageView
import org.json.JSONArray
import org.json.JSONObject
import java.lang.reflect.Method
import java.util.IdentityHashMap

/**
 * The `renderLoops` feature: names the views that keep a screen drawing while
 * nobody touches it (a looping Lottie or Rive animation, a shimmer, a spinner, a
 * video or WebView). The JS profile can't see these: the work is on the
 * RenderThread and the GPU, not in JS.
 *
 * Triggered from the sampler thread when, for [SUSTAINED_WINDOWS] windows in a
 * row, there was no touch for [IDLE_MS] and the screen kept drawing or the
 * RenderThread stayed busy. At most once per [SCREEN_COOLDOWN_MS] per screen.
 * The inspection itself runs on the main thread: two walks of the view tree
 * [SNAPSHOT_GAP_MS] apart.
 */
internal object PerfRenderLoops {
    private const val SUSTAINED_WINDOWS = 3
    private const val IDLE_MS = 3_000L
    private const val ACTIVE_SHARE = 0.25
    private const val RENDER_THREAD_TRIGGER = 50.0
    private const val SCREEN_COOLDOWN_MS = 30_000L
    private const val SNAPSHOT_GAP_MS = 150L
    private const val MAX_VIEWS = 20
    private const val MAX_NODES = 5_000
    private const val MAX_IDLE_MS = 86_400_000L
    private const val EPSILON = 0.01f
    private val CLASS_NAME = Regex("[^A-Za-z0-9_.$]")

    /** SystemClock.uptimeMillis() of the last touch; written on the main thread. */
    @Volatile
    var lastTouchAt = 0L

    private val mainHandler = Handler(Looper.getMainLooper())

    // Sampler-thread state.
    private var run = 0
    private val lastInspectedAt = HashMap<String, Long>()

    // Main-thread cache: class → its no-arg boolean "is playing" getter, if any.
    private val playingGetters = HashMap<Class<*>, Method?>()

    /** Sampler thread, once per window while the feature is on and recording. */
    fun onWindow(
        activity: Activity?,
        screen: String?,
        frames: Int,
        refreshRate: Float,
        elapsedSec: Double,
        renderThreadCpu: Double,
        now: Long,
        mono: Long,
    ) {
        val idleMs = SystemClock.uptimeMillis() - lastTouchAt
        val drawing = frames >= refreshRate * elapsedSec * ACTIVE_SHARE || renderThreadCpu >= RENDER_THREAD_TRIGGER
        run = if (drawing && idleMs >= IDLE_MS) run + 1 else 0
        if (run < SUSTAINED_WINDOWS || activity == null) return
        val key = screen ?: ""
        if (now - (lastInspectedAt[key] ?: 0L) < SCREEN_COOLDOWN_MS) return
        lastInspectedAt[key] = now
        run = 0
        val loop = JSONObject()
            .put("t", now)
            .put("mono", mono)
            .put("screen", screen ?: JSONObject.NULL)
            .put("refreshRate", Math.round(refreshRate))
            .put("frames", frames)
            .put("renderThreadCpu", Math.round(renderThreadCpu * 10) / 10.0)
            .put("idleMs", idleMs.coerceIn(0L, MAX_IDLE_MS))
        mainHandler.post { inspect(activity, loop) }
    }

    fun reset() {
        run = 0
    }

    private class Found(val view: View, val reason: String)

    /** Main thread. */
    private fun inspect(activity: Activity, loop: JSONObject) {
        if (activity.isFinishing || activity.isDestroyed) return
        val root = activity.window?.decorView ?: return
        val before = IdentityHashMap<View, FloatArray>()
        val found = ArrayList<Found>()
        runCatching { walk(root, before, found) }
        mainHandler.postDelayed({
            runCatching {
                for ((view, state) in before) {
                    if (found.size >= MAX_VIEWS * 2) break
                    if (!view.isAttachedToWindow || !view.isShown) continue
                    if (changed(state, stateOf(view)) && found.none { it.view === view }) found.add(Found(view, "moving"))
                }
                // Views that report playing first: they name the library, not just a container.
                val order = listOf("playing", "drawable", "surface", "moving")
                val views = JSONArray()
                found.sortedBy { order.indexOf(it.reason) }.take(MAX_VIEWS).forEach { views.put(describe(it)) }
                loop.put("views", views)
                PerfSession.onRenderLoop(loop)
            }
        }, SNAPSHOT_GAP_MS)
    }

    private val rect = Rect()

    private fun walk(root: View, states: IdentityHashMap<View, FloatArray>, found: ArrayList<Found>) {
        val stack = ArrayDeque<View>()
        stack.addLast(root)
        var nodes = 0
        while (stack.isNotEmpty() && nodes < MAX_NODES) {
            val view = stack.removeLast()
            nodes++
            if (view.visibility != View.VISIBLE || !view.getGlobalVisibleRect(rect)) continue
            states[view] = stateOf(view)
            reasonOf(view)?.let { found.add(Found(view, it)) }
            if (view is ViewGroup && view !is WebView) {
                for (i in 0 until view.childCount) stack.addLast(view.getChildAt(i))
            }
        }
    }

    private fun reasonOf(view: View): String? {
        if (view is TextureView || view is SurfaceView || view is WebView) {
            // Rive and video draw into a TextureView/SurfaceView; prefer their own flag.
            return if (isPlaying(view)) "playing" else "surface"
        }
        if (isPlaying(view)) return "playing"
        val animation = view.animation
        if (animation != null && animation.hasStarted() && !animation.hasEnded()) return "moving"
        if (isRunning(view.background)) return "drawable"
        if (view is ImageView && isRunning(view.drawable)) return "drawable"
        if (isFrescoAnimationRunning(view)) return "drawable"
        return null
    }

    private fun isRunning(drawable: Any?): Boolean = drawable is Animatable && drawable.isRunning

    /** Lottie's isAnimating(), Rive's and video views' isPlaying(): public no-arg boolean getters. */
    private fun isPlaying(view: View): Boolean {
        // getOrPut would redo the lookup for classes without a getter (null value).
        val cls = view.javaClass
        if (!playingGetters.containsKey(cls)) {
            playingGetters[cls] = listOf("isAnimating", "isPlaying").firstNotNullOfOrNull { name ->
                runCatching { cls.getMethod(name) }.getOrNull()
                    ?.takeIf { it.returnType == java.lang.Boolean.TYPE }
            }
        }
        val getter = playingGetters[cls] ?: return false
        return runCatching { getter.invoke(view) as Boolean }.getOrDefault(false)
    }

    /** Fresco (RN images): an animated GIF/WebP runs in the controller's Animatable. */
    private fun isFrescoAnimationRunning(view: View): Boolean {
        if (view !is ImageView) return false
        return runCatching {
            val controller = view.javaClass.getMethod("getController").invoke(view) ?: return false
            isRunning(controller.javaClass.getMethod("getAnimatable").invoke(controller))
        }.getOrDefault(false)
    }

    private fun stateOf(view: View) = floatArrayOf(
        view.translationX, view.translationY, view.scaleX, view.scaleY, view.rotation, view.alpha,
        view.left.toFloat(), view.top.toFloat(), view.width.toFloat(), view.height.toFloat(),
        view.scrollX.toFloat(), view.scrollY.toFloat(),
    )

    private fun changed(a: FloatArray, b: FloatArray): Boolean {
        for (i in a.indices) if (Math.abs(a[i] - b[i]) > EPSILON) return true
        return false
    }

    private fun describe(found: Found): JSONObject {
        val view = found.view
        val className = view.javaClass.simpleName.ifEmpty { view.javaClass.name.substringAfterLast('.') }
        val layer = when (view.layerType) {
            View.LAYER_TYPE_SOFTWARE -> "software"
            View.LAYER_TYPE_HARDWARE -> "hardware"
            else -> "none"
        }
        return JSONObject()
            .put("view", className.replace(CLASS_NAME, "").take(80).ifEmpty { "View" })
            .put("id", PerfInteractions.nameOf(view) ?: JSONObject.NULL)
            .put("reason", found.reason)
            .put("w", view.width.coerceIn(0, 100_000))
            .put("h", view.height.coerceIn(0, 100_000))
            .put("layer", layer)
    }
}
