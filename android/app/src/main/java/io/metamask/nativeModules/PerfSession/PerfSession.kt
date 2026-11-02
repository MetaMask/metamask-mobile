package io.metamask.nativeModules.PerfSession

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.Process
import android.system.Os
import android.system.OsConstants
import android.util.Log
import android.view.FrameMetrics
import android.view.Window
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.ceil

/**
 * Always-on performance sampler for internal perf builds (`main-rc-perf` in builds.yml).
 *
 * Every 500ms while the app is in the foreground it records CPU per thread (from
 * /proc, the same source Flashlight reads over adb), RSS memory, and frame stats
 * from FrameMetrics, tagged with the screen JS reports through [setScreen].
 * Samples are batched to disk and POSTed to [endpoint]; the on-disk queue survives
 * app kills and offline periods and is drained on the next flush.
 *
 * All sampling state is confined to [samplerThread]; uploads run on their own thread.
 * Only started when BuildConfig.PERF_SESSION_URL is set, so other builds never run it.
 */
object PerfSession {
    private const val TAG = "PerfSession"
    private const val SAMPLE_INTERVAL_MS = 500L
    private const val SAMPLES_PER_BATCH = 20
    private const val FROZEN_FRAME_NS = 700_000_000L
    private const val MAX_QUEUED_BATCHES = 500
    private val KEY_THREADS = setOf("UI Thread", "mqt_v_js", "mqt_js", "mqt_v_native", "mqt_native_modu", "RenderThread")

    private lateinit var endpoint: String
    private lateinit var token: String
    private lateinit var queueDir: File
    private lateinit var handler: Handler
    private val uploader = Executors.newSingleThreadExecutor { Thread(it, "mm-perf-upload") }

    private var started = false
    private var deviceId = ""
    private val launchId = UUID.randomUUID().toString()
    private var meta = JSONObject()
    private val pid = Process.myPid()
    private val clockTicks = Os.sysconf(OsConstants._SC_CLK_TCK).toDouble()
    private val pageSizeMb = Os.sysconf(OsConstants._SC_PAGESIZE) / (1024.0 * 1024.0)
    private var refreshRate = 60f

    // Sampler-thread state.
    private var screen = "launch"
    private var foreground = false
    private var resumedActivity: Activity? = null
    private var previousTicks = HashMap<Int, Pair<String, Long>>()
    private var previousSampleAt = 0L
    private var frames = 0
    private var jankyFrames = 0
    private var frozenFrames = 0
    private var droppedVsyncs = 0L
    private var samples = JSONArray()
    private var events = JSONArray()

    private val frameListener = Window.OnFrameMetricsAvailableListener { _, metrics, _ ->
        if (metrics.getMetric(FrameMetrics.FIRST_DRAW_FRAME) == 1L) return@OnFrameMetricsAvailableListener
        val total = metrics.getMetric(FrameMetrics.TOTAL_DURATION)
        val vsync = (1_000_000_000L / refreshRate).toLong()
        val deadline = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) metrics.getMetric(FrameMetrics.DEADLINE) else vsync
        frames++
        if (total > deadline) jankyFrames++
        if (total > FROZEN_FRAME_NS) frozenFrames++
        droppedVsyncs += (ceil(total.toDouble() / vsync).toLong() - 1).coerceAtLeast(0)
    }

    fun start(app: Application, endpoint: String, token: String) {
        if (started || endpoint.isBlank()) return
        started = true
        this.endpoint = endpoint.trimEnd('/') + "/ingest"
        this.token = token
        queueDir = File(app.filesDir, "perf-session-queue").apply { mkdirs() }

        val prefs = app.getSharedPreferences("perf_session", Context.MODE_PRIVATE)
        deviceId = prefs.getString("device_id", null)
            ?: UUID.randomUUID().toString().also { prefs.edit().putString("device_id", it).apply() }
        meta = JSONObject()
            .put("manufacturer", Build.MANUFACTURER)
            .put("model", Build.MODEL)
            .put("sdk", Build.VERSION.SDK_INT)
            .put("cores", Runtime.getRuntime().availableProcessors())
            .put("appVersion", app.packageManager.getPackageInfo(app.packageName, 0).versionName)

        handler = Handler(HandlerThread("mm-perf-sampler").apply { start() }.looper)
        handler.post { event("launch", null) }
        app.registerActivityLifecycleCallbacks(lifecycle)
        handler.postDelayed(::tick, SAMPLE_INTERVAL_MS)
        uploader.execute(::drainQueue)
        Log.i(TAG, "Recording to $endpoint (device $deviceId)")
    }

    fun setScreen(name: String) {
        if (!started) return
        handler.post {
            if (name != screen) {
                screen = name
                event("screen", name)
            }
        }
    }

    private val lifecycle = object : Application.ActivityLifecycleCallbacks {
        override fun onActivityResumed(activity: Activity) {
            handler.post {
                resumedActivity = activity
                refreshRate = activity.windowManager.defaultDisplay.refreshRate
                meta.put("refreshRate", refreshRate.toInt())
                activity.window.addOnFrameMetricsAvailableListener(frameListener, handler)
                foreground = true
                // CPU ticks accumulated in the background would inflate the first delta.
                previousTicks = readThreadTicks()
                previousSampleAt = System.currentTimeMillis()
                event("foreground", null)
            }
        }

        override fun onActivityPaused(activity: Activity) {
            handler.post {
                runCatching { activity.window.removeOnFrameMetricsAvailableListener(frameListener) }
                if (resumedActivity === activity) resumedActivity = null
                foreground = false
                event("background", null)
                // The app may be killed from the background; get the data out now.
                flush()
            }
        }

        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
        override fun onActivityStarted(activity: Activity) = Unit
        override fun onActivityStopped(activity: Activity) = Unit
        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
        override fun onActivityDestroyed(activity: Activity) = Unit
    }

    private fun tick() {
        try {
            if (foreground) sample()
            if (samples.length() >= SAMPLES_PER_BATCH) flush()
        } catch (e: Exception) {
            Log.w(TAG, "Sampling failed", e)
        }
        handler.postDelayed(::tick, SAMPLE_INTERVAL_MS)
    }

    private fun sample() {
        val now = System.currentTimeMillis()
        val ticks = readThreadTicks()
        val elapsedSec = (now - previousSampleAt) / 1000.0
        if (elapsedSec <= 0) return

        val cpuByName = HashMap<String, Double>()
        for ((tid, nameAndTicks) in ticks) {
            val before = previousTicks[tid]?.second ?: continue
            val pct = (nameAndTicks.second - before) / clockTicks / elapsedSec * 100
            if (pct > 0) cpuByName.merge(nameAndTicks.first, pct, Double::plus)
        }
        // Keep the threads that explain RN jank, plus the busiest few others.
        val cpu = JSONObject()
        cpuByName.entries
            .filter { it.key in KEY_THREADS || it.value >= 1.0 }
            .sortedByDescending { it.value }
            .take(10)
            .forEach { cpu.put(it.key, Math.round(it.value * 10) / 10.0) }

        val fps = if (frames == 0) JSONObject.NULL
        else Math.round(refreshRate * frames / (frames + droppedVsyncs).toDouble()).toInt()

        samples.put(
            JSONObject()
                .put("t", now)
                .put("screen", screen)
                .put("fps", fps)
                .put("frames", frames)
                .put("janky", jankyFrames)
                .put("frozen", frozenFrames)
                .put("ram", Math.round(readRssMb()))
                .put("cpu", cpu)
        )
        previousTicks = ticks
        previousSampleAt = now
        frames = 0
        jankyFrames = 0
        frozenFrames = 0
        droppedVsyncs = 0
    }

    /** tid → (thread name, utime + stime ticks), read from /proc/self/task. */
    private fun readThreadTicks(): HashMap<Int, Pair<String, Long>> {
        val result = HashMap<Int, Pair<String, Long>>()
        File("/proc/self/task").listFiles()?.forEach { dir ->
            val tid = dir.name.toIntOrNull() ?: return@forEach
            val stat = runCatching { File(dir, "stat").readText() }.getOrNull() ?: return@forEach
            val open = stat.indexOf('(')
            val close = stat.lastIndexOf(')')
            if (open < 0 || close < open) return@forEach
            // Fields after "(comm)": state is [0], utime [11], stime [12] (proc(5) fields 14 and 15).
            val fields = stat.substring(close + 2).split(' ')
            val utime = fields.getOrNull(11)?.toLongOrNull() ?: return@forEach
            val stime = fields.getOrNull(12)?.toLongOrNull() ?: return@forEach
            // Flashlight names the main thread "UI Thread"; match it so reports line up.
            val name = if (tid == pid) "UI Thread" else stat.substring(open + 1, close)
            result[tid] = name to (utime + stime)
        }
        return result
    }

    private fun readRssMb(): Double {
        val residentPages = File("/proc/self/statm").readText().split(' ').getOrNull(1)?.toLongOrNull() ?: 0
        return residentPages * pageSizeMb
    }

    private fun event(type: String, value: String?) {
        events.put(JSONObject().put("t", System.currentTimeMillis()).put("type", type).put("value", value ?: JSONObject.NULL))
    }

    private fun flush() {
        if (samples.length() == 0 && events.length() == 0) return
        val batch = JSONObject()
            .put("v", 1)
            .put("deviceId", deviceId)
            .put("launchId", launchId)
            .put("meta", meta)
            .put("samples", samples)
            .put("events", events)
        samples = JSONArray()
        events = JSONArray()
        runCatching {
            File(queueDir, "${System.currentTimeMillis()}-${UUID.randomUUID()}.json").writeText(batch.toString())
        }.onFailure { Log.w(TAG, "Could not queue batch", it) }
        uploader.execute(::drainQueue)
    }

    /** Uploads queued batches oldest-first; stops at the first failure and retries on the next flush. */
    private fun drainQueue() {
        val files = queueDir.listFiles()?.sortedBy { it.name } ?: return
        files.dropLast(MAX_QUEUED_BATCHES).forEach { it.delete() }
        for (file in files.takeLast(MAX_QUEUED_BATCHES)) {
            if (!post(file.readBytes())) return
            file.delete()
        }
    }

    private fun post(body: ByteArray): Boolean = runCatching {
        val connection = URL(endpoint).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $token")
            // localtunnel and free ngrok domains serve a browser warning page unless
            // these headers are present.
            connection.setRequestProperty("bypass-tunnel-reminder", "1")
            connection.setRequestProperty("ngrok-skip-browser-warning", "1")
            connection.outputStream.use { it.write(body) }
            connection.responseCode in 200..299
        } finally {
            connection.disconnect()
        }
    }.getOrElse {
        Log.d(TAG, "Upload failed, will retry", it)
        false
    }
}
