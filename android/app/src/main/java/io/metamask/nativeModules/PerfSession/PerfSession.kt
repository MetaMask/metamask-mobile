package io.metamask.nativeModules.PerfSession

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.Process
import android.os.SystemClock
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
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.ceil

/**
 * Always-on performance sampler for internal test builds (builds.yml entries that
 * merge `*perf_session`, e.g. `main-exp`). Wire format: perf-collector CONTRACT.md (v3).
 *
 * Every second while the app is in the foreground it records CPU per thread (from
 * /proc, the same source Flashlight reads over adb), RSS memory, and frame stats
 * from FrameMetrics, tagged with the screen JS reports through [setScreen]. Optional
 * features (feature spans, interactions, frame phases, Redux and JS lag, UI-thread
 * stalls, Hermes profiles) are switched on and off by the collector at runtime.
 * Samples are batched to disk and POSTed to the collector; the on-disk queue
 * survives app kills and offline periods and is drained on the next flush.
 *
 * The collector is also the on/off switch: the sampler asks `GET /status` at launch,
 * on resume and periodically, and only records while it answers `record: true`.
 * While the collector is off or unreachable nothing is sampled or queued.
 *
 * Every record carries wall-clock `t` (epoch ms) and monotonic `mono`
 * (System.nanoTime() / 1000, CLOCK_MONOTONIC µs) so it can be lined up with Hermes
 * profiles, Perfetto traces and other tools; each batch adds a `clock` pair.
 *
 * All sampling state is confined to the sampler thread; network runs on its own thread.
 * Only started when BuildConfig.PERF_SESSION_URL is set, so other builds never run it.
 */
object PerfSession {
    internal const val TAG = "PerfSession"
    private const val SAMPLE_INTERVAL_MS = 1000L
    private const val SAMPLES_PER_BATCH = 10
    private const val MAX_EVENTS_PER_BATCH = 250
    private const val MAX_SPANS_PER_BATCH = 150
    // The contract's limit. Stalls never force a flush: a screen that stalls every
    // second would otherwise upload every few seconds. Extra stalls are dropped.
    private const val MAX_STALLS_PER_BATCH = 20
    private const val MAX_RENDER_LOOPS_PER_BATCH = 5
    private const val MAX_UNCONFIRMED_SAMPLES = 60
    private const val MAX_BATCH_CHARS = 240_000
    private const val FROZEN_FRAME_NS = 700_000_000L
    private const val MAX_QUEUED_BATCHES = 500
    // Below this share of the display's refresh rate the window is an idle redraw, not
    // active rendering, so FPS would be misleading; frame counts are still reported.
    private const val ACTIVE_RENDERING_RATIO = 0.25
    private const val DEFAULT_STATUS_INTERVAL_MS = 300_000L
    private const val MIN_STATUS_RECHECK_MS = 60_000L
    internal const val THREAD_PREFIX = "mm-perf-"
    private const val SAMPLER_THREAD = "${THREAD_PREFIX}sampler"
    private const val NETWORK_THREAD = "${THREAD_PREFIX}upload"
    // The Hermes sampling profiler's timer thread; /proc truncates names to 15 characters.
    private const val HERMES_PROFILER_THREAD_PREFIX = "hermes-sampling"
    private val KEY_THREADS = setOf("UI Thread", "mqt_v_js", "mqt_js", "mqt_v_native", "mqt_native_modu", "RenderThread")
    private val JS_THREADS = setOf("mqt_v_js", "mqt_js")
    private val PHASES = arrayOf("input", "animation", "layout", "draw", "sync", "gpu")

    private enum class Recording { UNKNOWN, ON, OFF }

    private lateinit var baseUrl: String
    private lateinit var ingestUrl: String
    private lateinit var statusUrl: String
    private lateinit var key: String
    private lateinit var env: String
    private lateinit var queueDir: File
    internal lateinit var handler: Handler
        private set
    internal val network = Executors.newSingleThreadExecutor { Thread(it, NETWORK_THREAD) }

    private var started = false
    internal var deviceId = ""
        private set
    internal val launchId = UUID.randomUUID().toString()
    private var meta = JSONObject()
    private val pid = Process.myPid()
    private val clockTicks = Os.sysconf(OsConstants._SC_CLK_TCK).toDouble()
    private val pageSizeMb = Os.sysconf(OsConstants._SC_PAGESIZE) / (1024.0 * 1024.0)
    internal var appVersion = ""
        private set
    internal var versionCode = 0L
        private set

    /** Features the collector currently enables; read from the main and JS threads too. */
    @Volatile
    internal var features = PerfFeatures.NONE
        private set

    // Sampler-thread state.
    private var recording = Recording.UNKNOWN
    private var statusIntervalMs = DEFAULT_STATUS_INTERVAL_MS
    private var lastStatusCheckAt = 0L
    internal var screen = "launch"
        private set
    private var foreground = false
    private var resumedActivity: Activity? = null
    private var windowRefreshRate = 60f
    private var previousTicks = HashMap<Int, Pair<String, Long>>()
    private var previousSampleAt = 0L
    private var seq = 0
    private var firstFrameSeen = false
    private var samples = JSONArray()
    private var events = JSONArray()
    private var spans = JSONArray()
    private var stalls = JSONArray()
    private var renderLoops = JSONArray()
    private val batchFeatures = LinkedHashSet<String>()

    // Frame stats for the current window (sampler thread; FrameMetrics callbacks run on [handler]).
    private var frames = 0
    private var jankyFrames = 0
    private var frozenFrames = 0
    private var droppedVsyncs = 0L
    private var slowestFrameNs = 0L
    private val jankyPhaseNs = LongArray(PHASES.size)

    // JS-reported stats for the current window.
    private var jsLagMaxMs = -1.0
    private var reduxCount = 0
    private val reduxTypes = HashMap<String, Int>()

    private val frameListener = Window.OnFrameMetricsAvailableListener { _, metrics, _ ->
        if (metrics.getMetric(FrameMetrics.FIRST_DRAW_FRAME) == 1L) {
            if (!firstFrameSeen) {
                firstFrameSeen = true
                event("firstFrame", null)
            }
            return@OnFrameMetricsAvailableListener
        }
        val total = metrics.getMetric(FrameMetrics.TOTAL_DURATION)
        val vsync = (1_000_000_000L / windowRefreshRate).toLong()
        val deadline = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) metrics.getMetric(FrameMetrics.DEADLINE) else vsync
        frames++
        if (total > slowestFrameNs) slowestFrameNs = total
        if (total > deadline) {
            jankyFrames++
            if (features.framePhases) addPhases(metrics)
        }
        if (total > FROZEN_FRAME_NS) frozenFrames++
        droppedVsyncs += (ceil(total.toDouble() / vsync).toLong() - 1).coerceAtLeast(0)
    }

    fun start(app: Application, baseUrl: String, key: String, env: String) {
        if (started || baseUrl.isBlank()) return
        require(baseUrl.startsWith("https://")) { "Perf session URL must be https" }
        started = true
        this.baseUrl = baseUrl.trimEnd('/')
        ingestUrl = "${this.baseUrl}/ingest"
        statusUrl = "${this.baseUrl}/status?env=${URLEncoder.encode(env, "UTF-8")}"
        this.key = key
        this.env = env
        queueDir = File(app.filesDir, "perf-session-queue").apply { mkdirs() }

        val prefs = app.getSharedPreferences("perf_session", Context.MODE_PRIVATE)
        deviceId = prefs.getString("device_id", null)
            ?: UUID.randomUUID().toString().also { prefs.edit().putString("device_id", it).apply() }
        val packageInfo = app.packageManager.getPackageInfo(app.packageName, 0)
        appVersion = packageInfo.versionName ?: ""
        versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) packageInfo.longVersionCode
        else @Suppress("DEPRECATION") packageInfo.versionCode.toLong()
        meta = JSONObject()
            .put("manufacturer", Build.MANUFACTURER)
            .put("model", Build.MODEL)
            .put("sdk", Build.VERSION.SDK_INT)
            .put("cores", Runtime.getRuntime().availableProcessors())
            .put("appVersion", appVersion)
            .put("versionCode", versionCode)
            .put("processStartMono", processStartMono())

        handler = Handler(HandlerThread(SAMPLER_THREAD).apply { start() }.looper)
        PerfProfiles.init(app)
        // Sample optimistically until the first status answer so cold start is covered;
        // nothing is written to disk until the collector says to record.
        handler.post {
            event("launch", null)
            checkStatus()
        }
        app.registerActivityLifecycleCallbacks(lifecycle)
        handler.postDelayed(::tick, SAMPLE_INTERVAL_MS)
        Log.i(TAG, "Perf session for $env via ${this.baseUrl} (device $deviceId)")
    }

    fun setScreen(name: String) {
        if (!started) return
        handler.post {
            val safe = PerfSanitize.text(name, 100) ?: "redacted"
            if (safe != screen) {
                screen = safe
                event("screen", safe)
            }
        }
    }

    /**
     * Stats JS reports about once a second (see app/core/Performance/perfSession.ts):
     * completed `trace()` spans, the max event-loop lag and Redux action counts.
     * Returns the JS-side features to keep collecting, so JS can switch its probes off.
     */
    fun reportFromJs(json: String): String {
        if (!started) return PerfFeatures.NONE.jsJson()
        handler.post { runCatching { applyJsReport(JSONObject(json)) }.onFailure { Log.d(TAG, "Bad JS report", it) } }
        return currentJsFeatures().jsJson()
    }

    /** The shake-to-profile ProfilerManager owns the Hermes sampler while it records. */
    fun setManualProfiling(active: Boolean) {
        if (!started) return
        handler.post { PerfProfiles.setManualActive(active) }
    }

    internal fun monoUs(): Long = System.nanoTime() / 1000

    /** Converts a wall-clock time from this process to the monotonic clock. */
    internal fun wallToMono(t: Long): Long = monoUs() - (System.currentTimeMillis() - t) * 1000

    internal fun clockJson(): JSONObject = JSONObject()
        .put("t", System.currentTimeMillis())
        .put("mono", monoUs())
        .put("tzOffsetMin", TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60_000)

    internal fun authorizationHeader() = "Bearer $key"

    internal fun profileUrl() = "$baseUrl/profile"

    internal fun envName() = env

    private fun currentJsFeatures(): PerfFeatures =
        if (recording == Recording.OFF) PerfFeatures.NONE else features

    /** Process start on the System.nanoTime() (CLOCK_MONOTONIC) base, in µs. */
    private fun processStartMono(): Long {
        // getStartElapsedRealtime uses elapsedRealtime (CLOCK_BOOTTIME, counts deep sleep);
        // shift it by the current BOOTTIME→MONOTONIC offset.
        val offsetNs = System.nanoTime() - SystemClock.elapsedRealtimeNanos()
        return (Process.getStartElapsedRealtime() * 1_000_000 + offsetNs) / 1000
    }

    private val lifecycle = object : Application.ActivityLifecycleCallbacks {
        override fun onActivityResumed(activity: Activity) {
            // Window.Callback must be wrapped on the main thread; the wrapper is inert
            // until the collector enables interactions.
            if (features.interactions || features.renderLoops) PerfInteractions.attach(activity)
            handler.post {
                resumedActivity = activity
                windowRefreshRate = displayRefreshRate(activity)
                meta.put("refreshRate", windowRefreshRate.toInt())
                activity.window.addOnFrameMetricsAvailableListener(frameListener, handler)
                foreground = true
                // CPU ticks accumulated in the background would inflate the first delta.
                previousTicks = readThreadTicks()
                previousSampleAt = System.currentTimeMillis()
                resetFrameWindow()
                event("foreground", null)
                if (System.currentTimeMillis() - lastStatusCheckAt >= MIN_STATUS_RECHECK_MS) checkStatus()
                updateFeatureWorkers()
            }
        }

        override fun onActivityPaused(activity: Activity) {
            handler.post {
                runCatching { activity.window.removeOnFrameMetricsAvailableListener(frameListener) }
                if (resumedActivity === activity) resumedActivity = null
                foreground = false
                event("background", null)
                updateFeatureWorkers()
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
            PerfProfiles.tick(foreground && recording == Recording.ON && features.profiles)
            if (samples.length() >= SAMPLES_PER_BATCH || events.length() >= MAX_EVENTS_PER_BATCH ||
                spans.length() >= MAX_SPANS_PER_BATCH
            ) flush()
            // Still waiting for the first status answer: keep the buffer within one batch's limits.
            if (recording == Recording.UNKNOWN) {
                if (samples.length() >= MAX_UNCONFIRMED_SAMPLES) samples = JSONArray()
                if (events.length() >= MAX_EVENTS_PER_BATCH) events = JSONArray()
                if (spans.length() >= MAX_SPANS_PER_BATCH) spans = JSONArray()
                if (stalls.length() >= MAX_STALLS_PER_BATCH) stalls = JSONArray()
                if (renderLoops.length() >= MAX_RENDER_LOOPS_PER_BATCH) renderLoops = JSONArray()
            }
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

    private fun applyStatus(answer: StatusAnswer?) {
        val record = answer?.record == true
        answer?.intervalMs?.let { statusIntervalMs = it }
        val previous = recording
        if (record) {
            features = answer!!.features
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
            features = PerfFeatures.NONE
            samples = JSONArray()
            events = JSONArray()
            spans = JSONArray()
            stalls = JSONArray()
            renderLoops = JSONArray()
            batchFeatures.clear()
        }
        updateFeatureWorkers()
        if (record != (previous == Recording.ON)) Log.i(TAG, if (record) "Recording ${features.names()}" else "Not recording")
    }

    /** Starts or stops the helpers whose work depends on the enabled features. */
    private fun updateFeatureWorkers() {
        val active = foreground && recording != Recording.OFF
        PerfInteractions.enabled = active && features.interactions
        resumedActivity?.let { activity ->
            if (active && (features.interactions || features.renderLoops)) activity.runOnUiThread { PerfInteractions.attach(activity) }
        }
        if (!(active && features.renderLoops)) PerfRenderLoops.reset()
        PerfStallWatchdog.setActive(active && features.uiStalls)
        PerfProfiles.tick(foreground && recording == Recording.ON && features.profiles)
    }

    private fun sample() {
        val now = System.currentTimeMillis()
        val mono = monoUs()
        val ticks = readThreadTicks()
        val elapsedSec = (now - previousSampleAt) / 1000.0
        if (elapsedSec <= 0) return
        resumedActivity?.let { windowRefreshRate = displayRefreshRate(it) }

        val cpuByName = HashMap<String, Double>()
        for ((tid, nameAndTicks) in ticks) {
            val before = previousTicks[tid]?.second ?: continue
            val pct = (nameAndTicks.second - before) / clockTicks / elapsedSec * 100
            if (pct > 0) cpuByName.merge(nameAndTicks.first, pct, Double::plus)
        }
        // The sampler's own cost (its threads and Hermes' profiler timer) is reported
        // separately so it never shows up as app work.
        var selfCpu = 0.0
        val iterator = cpuByName.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            if (entry.key.startsWith(THREAD_PREFIX) || entry.key.startsWith(HERMES_PROFILER_THREAD_PREFIX)) {
                selfCpu += entry.value
                iterator.remove()
            }
        }
        val jsCpu = JS_THREADS.sumOf { cpuByName[it] ?: 0.0 }
        // Keep the threads that explain RN jank, plus the busiest few others.
        val cpu = JSONObject()
        cpuByName.entries
            .filter { it.key in KEY_THREADS || it.value >= 1.0 }
            .sortedByDescending { it.value }
            .take(10)
            .forEach { entry -> PerfSanitize.text(entry.key, 32)?.let { cpu.put(it, round1(entry.value)) } }

        val activeRendering = frames >= windowRefreshRate * elapsedSec * ACTIVE_RENDERING_RATIO
        val fps = if (!activeRendering || frames == 0) JSONObject.NULL
        else Math.round(windowRefreshRate * frames / (frames + droppedVsyncs).toDouble()).toInt()

        val sample = JSONObject()
            .put("t", now)
            .put("mono", mono)
            .put("screen", screen)
            .put("refreshRate", Math.round(windowRefreshRate))
            .put("fps", fps)
            .put("frames", frames)
            .put("janky", jankyFrames)
            .put("frozen", frozenFrames)
            .put("ram", Math.round(readRssMb()))
            .put("javaHeapMb", javaHeapMb())
            .put("cpu", cpu)
            .put("selfCpu", round1(selfCpu))
        if (features.framePhases) {
            batchFeatures.add("framePhases")
            sample.put("slowestFrameMs", round1(slowestFrameNs / 1_000_000.0))
            sample.put("phases", phasesJson())
        }
        if (features.jsLag && jsLagMaxMs >= 0) {
            batchFeatures.add("jsLag")
            sample.put("jsLagMs", Math.round(jsLagMaxMs))
        }
        if (features.redux && reduxCount > 0) {
            batchFeatures.add("redux")
            sample.put("redux", reduxJson())
        }
        samples.put(sample)
        PerfProfiles.onWindow(frozenFrames, frames, jankyFrames, jsCpu, if (jsLagMaxMs >= 0) jsLagMaxMs else null)
        if (features.renderLoops && recording == Recording.ON) {
            PerfRenderLoops.onWindow(
                resumedActivity, screen, frames, windowRefreshRate, elapsedSec,
                cpuByName["RenderThread"] ?: 0.0, now, mono,
            )
        }

        previousTicks = ticks
        previousSampleAt = now
        resetFrameWindow()
        jsLagMaxMs = -1.0
        reduxCount = 0
        reduxTypes.clear()
    }

    private fun resetFrameWindow() {
        frames = 0
        jankyFrames = 0
        frozenFrames = 0
        droppedVsyncs = 0
        slowestFrameNs = 0
        jankyPhaseNs.fill(0)
    }

    private fun addPhases(metrics: FrameMetrics) {
        jankyPhaseNs[0] += metrics.getMetric(FrameMetrics.INPUT_HANDLING_DURATION)
        jankyPhaseNs[1] += metrics.getMetric(FrameMetrics.ANIMATION_DURATION)
        jankyPhaseNs[2] += metrics.getMetric(FrameMetrics.LAYOUT_MEASURE_DURATION)
        jankyPhaseNs[3] += metrics.getMetric(FrameMetrics.DRAW_DURATION)
        jankyPhaseNs[4] += metrics.getMetric(FrameMetrics.SYNC_DURATION)
        var gpu = metrics.getMetric(FrameMetrics.COMMAND_ISSUE_DURATION) + metrics.getMetric(FrameMetrics.SWAP_BUFFERS_DURATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) gpu += metrics.getMetric(FrameMetrics.GPU_DURATION)
        jankyPhaseNs[5] += gpu
    }

    private fun phasesJson(): Any {
        if (jankyFrames == 0) return JSONObject.NULL
        val phases = JSONObject()
        PHASES.forEachIndexed { index, name -> phases.put(name, round1(jankyPhaseNs[index] / 1_000_000.0 / jankyFrames)) }
        return phases
    }

    private fun reduxJson(): JSONObject {
        val top = JSONObject()
        reduxTypes.entries.sortedByDescending { it.value }.take(5).forEach { top.put(it.key, it.value) }
        return JSONObject().put("count", reduxCount).put("top", top)
    }

    private fun applyJsReport(report: JSONObject) {
        if (recording == Recording.OFF) return
        if (features.spans) {
            val reported = report.optJSONArray("spans")
            if (reported != null && reported.length() > 0) batchFeatures.add("spans")
            for (i in 0 until (reported?.length() ?: 0)) {
                val span = reported!!.optJSONObject(i) ?: continue
                val name = PerfSanitize.text(span.optString("name"), 100) ?: continue
                val t = span.optLong("t", 0)
                val durationMs = span.optDouble("durationMs", -1.0)
                if (t <= 0 || durationMs < 0 || durationMs > 3_600_000) continue
                val out = JSONObject().put("name", name).put("t", t).put("mono", wallToMono(t))
                    .put("durationMs", round1(durationMs))
                PerfSanitize.text(span.optString("id"), 64)?.let { out.put("id", it) }
                when (span.optString("status")) {
                    "ok" -> out.put("status", "ok")
                    "error" -> out.put("status", "error")
                }
                if (spans.length() < MAX_SPANS_PER_BATCH * 2) spans.put(out)
            }
        }
        if (features.jsLag && report.has("jsLagMs")) {
            val lag = report.optDouble("jsLagMs", -1.0)
            if (lag >= 0 && lag > jsLagMaxMs) jsLagMaxMs = lag.coerceAtMost(600_000.0)
        }
        if (features.redux) {
            report.optJSONObject("redux")?.let { redux ->
                reduxCount += redux.optInt("count", 0).coerceIn(0, 1_000_000)
                val types = redux.optJSONObject("types") ?: return@let
                for (type in types.keys()) {
                    val safe = PerfSanitize.text(type, 100) ?: continue
                    reduxTypes.merge(safe, types.optInt(type, 0).coerceIn(0, 1_000_000), Int::plus)
                }
            }
        }
    }

    /** Called by [PerfStallWatchdog] on its own thread. */
    internal fun onStall(t: Long, mono: Long, durationMs: Long, stack: List<String>) {
        handler.post {
            if (recording == Recording.OFF || !features.uiStalls) return@post
            batchFeatures.add("uiStalls")
            val frames = JSONArray()
            stack.take(40).forEach { frame -> PerfSanitize.text(frame, 200)?.let { frames.put(it) } }
            if (stalls.length() < MAX_STALLS_PER_BATCH) {
                stalls.put(
                    JSONObject().put("t", t).put("mono", mono).put("durationMs", durationMs)
                        .put("screen", screen).put("stack", frames)
                )
            }
            PerfProfiles.onTrigger("stall")
        }
    }

    /** Called by [PerfRenderLoops] from the main thread. */
    internal fun onRenderLoop(loop: JSONObject) {
        handler.post {
            if (recording != Recording.ON || !features.renderLoops) return@post
            batchFeatures.add("renderLoops")
            if (renderLoops.length() < MAX_RENDER_LOOPS_PER_BATCH) renderLoops.put(loop)
        }
    }

    /** Called by [PerfInteractions] from the main thread. */
    internal fun onInteraction(type: String, value: String?, t: Long, mono: Long) {
        handler.post {
            if (recording == Recording.OFF || !features.interactions) return@post
            batchFeatures.add("interactions")
            event(type, value, t, mono)
        }
    }

    private fun displayRefreshRate(activity: Activity): Float {
        val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) activity.display
        else @Suppress("DEPRECATION") activity.windowManager.defaultDisplay
        return display?.refreshRate?.takeIf { it > 0 } ?: windowRefreshRate
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

    private fun javaHeapMb(): Long {
        val runtime = Runtime.getRuntime()
        return (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
    }

    private fun event(type: String, value: String?, t: Long = System.currentTimeMillis(), mono: Long = monoUs()) {
        if (recording == Recording.OFF) return
        events.put(JSONObject().put("t", t).put("mono", mono).put("type", type).put("value", value ?: JSONObject.NULL))
    }

    /** Writes the pending batch to the disk queue once the collector has said to record. */
    private fun flush() {
        if (recording != Recording.ON) return
        if (samples.length() == 0 && events.length() == 0 && spans.length() == 0 && stalls.length() == 0 &&
            renderLoops.length() == 0
        ) return
        val batch = JSONObject()
            .put("v", 3)
            .put("env", env)
            .put("deviceId", deviceId)
            .put("launchId", launchId)
            .put("seq", seq++)
            .put("clock", clockJson())
            .put("features", JSONArray(batchFeatures.toList()))
            .put("meta", meta)
            .put("samples", samples)
            .put("events", limit(events, 300))
            .put("spans", limit(spans, 200))
        val batchStalls = limit(stalls, MAX_STALLS_PER_BATCH)
        if (batchStalls.length() > 0) {
            batch.put("stacks", shareStacks(batchStalls)).put("stalls", batchStalls)
        }
        if (renderLoops.length() > 0) batch.put("renderLoops", renderLoops)
        samples = JSONArray()
        events = JSONArray()
        spans = JSONArray()
        stalls = JSONArray()
        renderLoops = JSONArray()
        batchFeatures.clear()
        var body = batch.toString()
        if (body.length > MAX_BATCH_CHARS) {
            // Stall stacks are the bulk; shorten them before giving up anything else.
            val stacks = batch.optJSONArray("stacks") ?: JSONArray()
            for (i in 0 until stacks.length()) {
                val stack = stacks.getJSONArray(i)
                while (stack.length() > 10) stack.remove(stack.length() - 1)
            }
            body = batch.toString()
            if (body.length > MAX_BATCH_CHARS) batch.put("events", limit(batch.getJSONArray("events"), 100))
            body = batch.toString()
        }
        runCatching {
            File(queueDir, "${System.currentTimeMillis()}-${UUID.randomUUID()}.json").writeText(body)
        }.onFailure { Log.w(TAG, "Could not queue batch", it) }
        network.execute {
            drainQueue()
            PerfProfiles.drainQueue()
        }
    }

    /**
     * Replaces each stall's `stack` with `stackRef`, an index into the returned
     * table of distinct stacks. A screen that stalls repeatedly usually stalls in
     * the same place, so this is most of a batch's size. Per batch, so every batch
     * stays readable on its own.
     */
    private fun shareStacks(batchStalls: JSONArray): JSONArray {
        val stacks = JSONArray()
        val index = HashMap<String, Int>()
        for (i in 0 until batchStalls.length()) {
            val stall = batchStalls.getJSONObject(i)
            val stack = stall.remove("stack") as? JSONArray ?: JSONArray()
            val ref = index.getOrPut(stack.toString()) { stacks.put(stack); stacks.length() - 1 }
            stall.put("stackRef", ref)
        }
        return stacks
    }

    private fun limit(array: JSONArray, max: Int): JSONArray {
        if (array.length() <= max) return array
        val out = JSONArray()
        for (i in 0 until max) out.put(array.get(i))
        return out
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

    private class StatusAnswer(val record: Boolean, val intervalMs: Long, val features: PerfFeatures)

    /** The collector's answer, or null when it is unreachable or refuses. */
    private fun fetchStatus(): StatusAnswer? = runCatching {
        val connection = open("GET", statusUrl)
        try {
            if (connection.responseCode != 200) return@runCatching null
            val body = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
            val intervalMs = body.optLong("statusIntervalSec", DEFAULT_STATUS_INTERVAL_MS / 1000)
                .coerceIn(60, 3600) * 1000
            StatusAnswer(body.optBoolean("record", false), intervalMs, PerfFeatures.from(body.optJSONObject("features")))
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

    internal fun open(method: String, url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 5000
            readTimeout = 5000
            instanceFollowRedirects = false
            setRequestProperty("Authorization", authorizationHeader())
            // Free ngrok domains serve a browser warning page unless this header is present.
            setRequestProperty("ngrok-skip-browser-warning", "1")
        }

}
