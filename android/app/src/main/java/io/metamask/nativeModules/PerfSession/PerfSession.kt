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
import java.net.URLEncoder
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.ceil

/**
 * Always-on performance sampler for internal test builds (builds.yml entries that
 * merge `*perf_session`, e.g. `main-exp`).
 *
 * Every second while the app is in the foreground it records CPU per thread (from
 * /proc, the same source Flashlight reads over adb), RSS memory, and frame stats
 * from FrameMetrics, tagged with the screen JS reports through [setScreen].
 * Samples are batched to disk and POSTed to the collector; the on-disk queue
 * survives app kills and offline periods and is drained on the next flush.
 *
 * The collector is also the on/off switch: the sampler asks `GET /status` at launch,
 * on resume and periodically, and only records while it answers `record: true`.
 * While the collector is off or unreachable nothing is sampled or queued.
 *
 * All sampling state is confined to the sampler thread; network runs on its own thread.
 * Only started when BuildConfig.PERF_SESSION_URL is set, so other builds never run it.
 */
object PerfSession {
    private const val TAG = "PerfSession"
    private const val SAMPLE_INTERVAL_MS = 1000L
    private const val SAMPLES_PER_BATCH = 10
    private const val MAX_EVENTS_PER_BATCH = 50
    private const val MAX_UNCONFIRMED_SAMPLES = 60
    private const val FROZEN_FRAME_NS = 700_000_000L
    private const val MAX_QUEUED_BATCHES = 500
    // Below this share of the display's refresh rate the window is an idle redraw, not
    // active rendering, so FPS would be misleading; frame counts are still reported.
    private const val ACTIVE_RENDERING_RATIO = 0.25
    private const val DEFAULT_STATUS_INTERVAL_MS = 300_000L
    private const val MIN_STATUS_RECHECK_MS = 60_000L
    private const val SAMPLER_THREAD = "mm-perf-sampler"
    private const val NETWORK_THREAD = "mm-perf-upload"
    private val OWN_THREADS = setOf(SAMPLER_THREAD, NETWORK_THREAD)
    private val KEY_THREADS = setOf("UI Thread", "mqt_v_js", "mqt_js", "mqt_v_native", "mqt_native_modu", "RenderThread")

    private enum class Recording { UNKNOWN, ON, OFF }

    private lateinit var ingestUrl: String
    private lateinit var statusUrl: String
    private lateinit var key: String
    private lateinit var env: String
    private lateinit var queueDir: File
    private lateinit var handler: Handler
    private val network = Executors.newSingleThreadExecutor { Thread(it, NETWORK_THREAD) }

    private var started = false
    private var deviceId = ""
    private val launchId = UUID.randomUUID().toString()
    private var meta = JSONObject()
    private val pid = Process.myPid()
    private val clockTicks = Os.sysconf(OsConstants._SC_CLK_TCK).toDouble()
    private val pageSizeMb = Os.sysconf(OsConstants._SC_PAGESIZE) / (1024.0 * 1024.0)
    private var refreshRate = 60f

    // Sampler-thread state.
    private var recording = Recording.UNKNOWN
    private var statusIntervalMs = DEFAULT_STATUS_INTERVAL_MS
    private var lastStatusCheckAt = 0L
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

    fun start(app: Application, baseUrl: String, key: String, env: String) {
        if (started || baseUrl.isBlank()) return
        require(baseUrl.startsWith("https://")) { "Perf session URL must be https" }
        started = true
        val base = baseUrl.trimEnd('/')
        ingestUrl = "$base/ingest"
        statusUrl = "$base/status?env=${URLEncoder.encode(env, "UTF-8")}"
        this.key = key
        this.env = env
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

        handler = Handler(HandlerThread(SAMPLER_THREAD).apply { start() }.looper)
        // Sample optimistically until the first status answer so cold start is covered;
        // nothing is written to disk until the collector says to record.
        handler.post {
            event("launch", null)
            checkStatus()
        }
        app.registerActivityLifecycleCallbacks(lifecycle)
        handler.postDelayed(::tick, SAMPLE_INTERVAL_MS)
        Log.i(TAG, "Perf session for $env via $base (device $deviceId)")
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
                if (System.currentTimeMillis() - lastStatusCheckAt >= MIN_STATUS_RECHECK_MS) checkStatus()
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
            if (foreground && recording != Recording.OFF) sample()
            if (samples.length() >= SAMPLES_PER_BATCH || events.length() >= MAX_EVENTS_PER_BATCH) flush()
            // Still waiting for the first status answer: keep the buffer within one batch's limits.
            if (recording == Recording.UNKNOWN && samples.length() >= MAX_UNCONFIRMED_SAMPLES) samples = JSONArray()
            if (recording == Recording.UNKNOWN && events.length() >= MAX_EVENTS_PER_BATCH) events = JSONArray()
            if (foreground && System.currentTimeMillis() - lastStatusCheckAt >= statusIntervalMs) checkStatus()
        } catch (e: Exception) {
            Log.w(TAG, "Sampling failed", e)
        }
        handler.postDelayed(::tick, SAMPLE_INTERVAL_MS)
    }

    /** Asks the collector whether to record; the answer is applied on the sampler thread. */
    private fun checkStatus() {
        lastStatusCheckAt = System.currentTimeMillis()
        network.execute {
            val answer = fetchStatus()
            handler.post { applyStatus(answer) }
        }
    }

    private fun applyStatus(answer: Pair<Boolean, Long>?) {
        val record = answer?.first == true
        answer?.second?.let { statusIntervalMs = it }
        val previous = recording
        if (record) {
            recording = Recording.ON
            if (previous == Recording.OFF) {
                // Re-anchor the timeline so the collector knows where this device is.
                event("screen", screen)
                if (foreground) event("foreground", null)
            }
            flush()
        } else {
            // Data recorded while the collector said yes still goes out; anything
            // sampled before the first answer is dropped.
            if (previous == Recording.ON) flush()
            recording = Recording.OFF
            samples = JSONArray()
            events = JSONArray()
        }
        if (record != (previous == Recording.ON)) Log.i(TAG, if (record) "Recording" else "Not recording")
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
        // The sampler's own cost is reported separately so it never shows up as app work.
        val selfCpu = OWN_THREADS.sumOf { cpuByName.remove(it) ?: 0.0 }
        // Keep the threads that explain RN jank, plus the busiest few others.
        val cpu = JSONObject()
        cpuByName.entries
            .filter { it.key in KEY_THREADS || it.value >= 1.0 }
            .sortedByDescending { it.value }
            .take(10)
            .forEach { cpu.put(it.key, round1(it.value)) }

        val activeRendering = frames >= refreshRate * elapsedSec * ACTIVE_RENDERING_RATIO
        val fps = if (!activeRendering || frames == 0) JSONObject.NULL
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
                .put("selfCpu", round1(selfCpu))
        )
        previousTicks = ticks
        previousSampleAt = now
        frames = 0
        jankyFrames = 0
        frozenFrames = 0
        droppedVsyncs = 0
    }

    private fun round1(value: Double) = Math.round(value * 10) / 10.0

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
        if (recording == Recording.OFF) return
        events.put(JSONObject().put("t", System.currentTimeMillis()).put("type", type).put("value", value ?: JSONObject.NULL))
    }

    /** Writes the pending batch to the disk queue once the collector has said to record. */
    private fun flush() {
        if (recording != Recording.ON) return
        if (samples.length() == 0 && events.length() == 0) return
        val batch = JSONObject()
            .put("v", 2)
            .put("env", env)
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
        network.execute(::drainQueue)
    }

    /** Uploads queued batches oldest-first; stops at the first retryable failure. */
    private fun drainQueue() {
        val files = queueDir.listFiles()?.sortedBy { it.name } ?: return
        files.dropLast(MAX_QUEUED_BATCHES).forEach { it.delete() }
        for (file in files.takeLast(MAX_QUEUED_BATCHES)) {
            val code = request("POST", ingestUrl, file.readBytes())
            when {
                code in 200..299 -> file.delete()
                // Malformed or too large: the collector will never accept it. Other codes
                // (401/403 while an env is off, 429, 5xx, offline) may succeed later.
                code == 400 || code == 413 -> file.delete()
                else -> return
            }
        }
    }

    /** `(record, statusIntervalMs)`, or null when the collector is unreachable or refuses. */
    private fun fetchStatus(): Pair<Boolean, Long>? = runCatching {
        val connection = open("GET", statusUrl)
        try {
            if (connection.responseCode != 200) return@runCatching null
            val body = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
            val intervalMs = body.optLong("statusIntervalSec", DEFAULT_STATUS_INTERVAL_MS / 1000)
                .coerceIn(60, 3600) * 1000
            (body.optBoolean("record", false)) to intervalMs
        } finally {
            connection.disconnect()
        }
    }.getOrElse {
        Log.d(TAG, "Status check failed", it)
        null
    }

    /** HTTP status code, or -1 when the request failed before getting one. */
    private fun request(method: String, url: String, body: ByteArray): Int = runCatching {
        val connection = open(method, url)
        try {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(body) }
            connection.responseCode
        } finally {
            connection.disconnect()
        }
    }.getOrElse {
        Log.d(TAG, "Upload failed, will retry", it)
        -1
    }

    private fun open(method: String, url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 5000
            readTimeout = 5000
            instanceFollowRedirects = false
            setRequestProperty("Authorization", "Bearer $key")
            // Free ngrok domains serve a browser warning page unless this header is present.
            setRequestProperty("ngrok-skip-browser-warning", "1")
        }
}
