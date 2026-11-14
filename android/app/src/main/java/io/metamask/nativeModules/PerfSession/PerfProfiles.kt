package io.metamask.nativeModules.PerfSession

import android.content.Context
import android.net.ConnectivityManager
import android.util.Log
import com.facebook.hermes.instrumentation.HermesSamplingProfiler
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.util.UUID
import java.util.zip.GZIPOutputStream

/**
 * Hermes CPU profiles around performance problems, for the `profiles` feature.
 *
 * While enabled (recording, foreground, not paused by the shake-to-profile
 * ProfilerManager) the Hermes sampling profiler runs and is dumped every
 * [SEGMENT_MS] to an app-private segment file, which also clears its buffer. Only
 * the last two segments are kept. A segment whose window saw a trigger (frozen
 * frame, UI stall, JS lag ≥ 250 ms, a janky burst or a busy JS thread) is gzipped
 * into an upload queue together with the previous segment, at most
 * `maxProfilesPerHour` per hour; the rest are deleted. Uploads only run on
 * unmetered networks and the queue is capped at [MAX_QUEUE_BYTES].
 *
 * Profiles are the Chrome trace-event JSON `dumpSampledTraceToFile` writes, the
 * same format react-native-release-profiler produces.
 *
 * Sampler-thread state except [drainQueue], which runs on the network thread.
 */
internal object PerfProfiles {
    private const val SEGMENT_MS = 10_000L
    private const val MAX_QUEUE_BYTES = 20L * 1024 * 1024
    private const val JS_LAG_TRIGGER_MS = 250.0
    private const val JANKY_BURST_SHARE = 0.3
    private const val JS_CPU_TRIGGER = 80.0
    private const val SUSTAINED_WINDOWS = 3
    private const val HOUR_MS = 3_600_000L
    private const val EMPTY_TRACE_MAX_BYTES = 16_384L
    private val EMPTY_SAMPLES = Regex("\"samples\"\\s*:\\s*\\[\\s*]")

    private class Segment(val file: File, val startT: Long, val startMono: Long, val endT: Long, val endMono: Long,
                          val trigger: String?, val screen: String, var queued: Boolean = false)

    private lateinit var appContext: Context
    private lateinit var segmentDir: File
    private lateinit var queueDir: File

    private var samplerOn = false
    private var manualActive = false
    private var segmentStartT = 0L
    private var segmentStartMono = 0L
    private var trigger: String? = null
    private var previous: Segment? = null
    private var jankyRun = 0
    private var jsCpuRun = 0
    private val queuedAt = ArrayDeque<Long>()

    fun init(context: Context) {
        appContext = context.applicationContext
        segmentDir = File(context.cacheDir, "perf-profile-segments").apply { mkdirs() }
        queueDir = File(context.filesDir, "perf-profile-queue").apply { mkdirs() }
        segmentDir.listFiles()?.forEach { it.delete() }
    }

    fun setManualActive(active: Boolean) {
        if (active && samplerOn) {
            // Hand the sampler over without stealing samples from the manual session.
            discardBuffer()
            samplerOn = false
            previous?.file?.delete()
            previous = null
        }
        // ProfilerManager disables the sampler when it stops, so ours restarts from scratch.
        manualActive = active
    }

    /** Called every sampler tick and whenever the feature or lifecycle changes. */
    fun tick(wanted: Boolean) {
        val active = wanted && !manualActive
        if (active && !samplerOn) {
            runCatching {
                HermesSamplingProfiler.enable()
                samplerOn = true
                startSegment()
            }.onFailure { Log.w(PerfSession.TAG, "Could not start Hermes sampling", it) }
        } else if (!active && samplerOn) {
            // Background, collector off or feature off: keep what was captured if it
            // matters, then stop sampling. Disable before the final dump: a sample
            // taken between the dump and disable() would stay in the buffer and
            // land in the next segment with an old timestamp.
            runCatching { HermesSamplingProfiler.disable() }
            if (!manualActive) finishSegment()
            samplerOn = false
            previous?.takeIf { !it.queued }?.file?.delete()
            previous = null
        } else if (active && System.currentTimeMillis() - segmentStartT >= SEGMENT_MS) {
            finishSegment()
            startSegment()
        }
    }

    /** One sampler window (about a second) of frame and thread stats. */
    fun onWindow(frozen: Int, frames: Int, janky: Int, jsCpu: Double, jsLagMs: Double?) {
        if (!samplerOn) return
        if (frozen > 0) onTrigger("freeze")
        if (jsLagMs != null && jsLagMs >= JS_LAG_TRIGGER_MS) onTrigger("jsLag")
        jankyRun = if (frames > 0 && janky.toDouble() / frames >= JANKY_BURST_SHARE) jankyRun + 1 else 0
        if (jankyRun >= SUSTAINED_WINDOWS) onTrigger("jank")
        jsCpuRun = if (jsCpu >= JS_CPU_TRIGGER) jsCpuRun + 1 else 0
        if (jsCpuRun >= SUSTAINED_WINDOWS) onTrigger("jsCpu")
    }

    fun onTrigger(name: String) {
        if (samplerOn && trigger == null) trigger = name
    }

    private fun startSegment() {
        segmentStartT = System.currentTimeMillis()
        segmentStartMono = PerfSession.monoUs()
        trigger = null
    }

    private fun finishSegment() {
        val file = File(segmentDir, "segment-${System.currentTimeMillis()}.cpuprofile")
        val dumped = runCatching { HermesSamplingProfiler.dumpSampledTraceToFile(file.absolutePath) }
            .onFailure { Log.w(PerfSession.TAG, "Could not dump Hermes profile", it) }
            .isSuccess
        if (!dumped || !file.exists()) return
        val segment = Segment(file, segmentStartT, segmentStartMono, System.currentTimeMillis(), PerfSession.monoUs(),
            trigger, PerfSession.screen)
        // Hermes takes no samples while the JS thread is idle. An empty segment has
        // nothing to show and mustn't use up the hourly cap, but the previous one
        // may still explain the trigger.
        val empty = hasNoSamples(file)
        if (segment.trigger != null) {
            // The cause often starts before the trigger fires, so send the previous segment too.
            previous?.takeIf { !it.queued }?.let { enqueue(it, segment.trigger) }
            if (!empty) enqueue(segment, segment.trigger)
        }
        // Queued segments were already copied into the upload queue.
        previous?.file?.delete()
        previous = if (empty) {
            file.delete()
            null
        } else {
            segment
        }
    }

    /** An empty trace is a few hundred bytes of metadata with `"samples":[]`. */
    private fun hasNoSamples(file: File): Boolean {
        if (file.length() > EMPTY_TRACE_MAX_BYTES) return false
        return EMPTY_SAMPLES.containsMatchIn(file.readText())
    }

    /** Clears the sampler's buffer without keeping the data. */
    private fun discardBuffer() {
        val scratch = File(segmentDir, "discard.cpuprofile")
        runCatching { HermesSamplingProfiler.dumpSampledTraceToFile(scratch.absolutePath) }
        scratch.delete()
    }

    private fun enqueue(segment: Segment, trigger: String) {
        val now = System.currentTimeMillis()
        while (queuedAt.isNotEmpty() && now - queuedAt.first() > HOUR_MS) queuedAt.removeFirst()
        if (queuedAt.size >= PerfSession.features.maxProfilesPerHour) return
        val profileId = UUID.randomUUID().toString()
        val meta = JSONObject()
            .put("v", 1)
            .put("env", PerfSession.envName())
            .put("deviceId", PerfSession.deviceId)
            .put("launchId", PerfSession.launchId)
            .put("profileId", profileId)
            .put("trigger", trigger)
            .put("start", JSONObject().put("t", segment.startT).put("mono", segment.startMono))
            .put("end", JSONObject().put("t", segment.endT).put("mono", segment.endMono))
            .put("clock", PerfSession.clockJson())
            .put("appVersion", PerfSession.appVersion)
            .put("versionCode", PerfSession.versionCode)
            .put("screen", segment.screen)
        runCatching {
            GZIPOutputStream(File(queueDir, "$profileId.json.gz").outputStream()).use { out ->
                segment.file.inputStream().use { it.copyTo(out) }
            }
            File(queueDir, "$profileId.meta.json").writeText(meta.toString())
            segment.queued = true
            queuedAt.addLast(now)
        }.onFailure { Log.w(PerfSession.TAG, "Could not queue profile", it) }
        trimQueue()
    }

    private fun trimQueue() {
        val bodies = queueDir.listFiles { file -> file.name.endsWith(".json.gz") }?.sortedBy { it.lastModified() } ?: return
        var total = bodies.sumOf { it.length() }
        for (body in bodies) {
            if (total <= MAX_QUEUE_BYTES) break
            total -= body.length()
            body.delete()
            File(queueDir, body.name.removeSuffix(".json.gz") + ".meta.json").delete()
        }
    }

    /** Network thread. Uploads queued profiles oldest-first on unmetered networks only. */
    fun drainQueue() {
        if (!::queueDir.isInitialized || !isUnmetered()) return
        val bodies = queueDir.listFiles { file -> file.name.endsWith(".json.gz") }?.sortedBy { it.lastModified() } ?: return
        for (body in bodies) {
            val metaFile = File(queueDir, body.name.removeSuffix(".json.gz") + ".meta.json")
            if (!metaFile.exists()) {
                body.delete()
                continue
            }
            val code = upload(body, metaFile.readText())
            when {
                code in 200..299 || code == 400 || code == 413 -> {
                    body.delete()
                    metaFile.delete()
                }
                else -> return
            }
        }
    }

    private fun upload(body: File, meta: String): Int = runCatching {
        val connection = PerfSession.open("POST", PerfSession.profileUrl())
        try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 30_000
            connection.doOutput = true
            connection.setFixedLengthStreamingMode(body.length())
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Content-Encoding", "gzip")
            // URLEncoder is form encoding; turn its "+" back into a proper space escape.
            connection.setRequestProperty("X-Perf-Profile", URLEncoder.encode(meta, "UTF-8").replace("+", "%20"))
            connection.outputStream.use { out -> body.inputStream().use { it.copyTo(out) } }
            connection.responseCode
        } finally {
            connection.disconnect()
        }
    }.getOrElse {
        Log.d(PerfSession.TAG, "Profile upload failed, will retry", it)
        -1
    }

    private fun isUnmetered(): Boolean {
        val connectivity = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        return connectivity.activeNetwork != null && !connectivity.isActiveNetworkMetered
    }
}
