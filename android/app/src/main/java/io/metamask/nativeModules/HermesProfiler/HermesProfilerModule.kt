package io.metamask.nativeModules.HermesProfiler

import android.os.Environment
import com.facebook.hermes.instrumentation.HermesSamplingProfiler
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * Hermes CPU profiling for BrowserStack performance APKs.
 *
 * Only registered when `BuildConfig.IS_PERFORMANCE_TEST` is true, so the module
 * is absent from production, RC, and smoke e2e builds.
 *
 * The stop sequence mirrors `react-native-release-profiler`'s shake-driven RC
 * flow (dump, then disable, both on the native modules thread) because that
 * ordering is known to work against the prebuilt `hermes-android` artifact.
 *
 * Destination differs from RC on purpose. RC copies to the shared Downloads
 * collection via MediaStore; `pullFile` from Downloads works on non-rooted
 * devices too, but app-scoped external storage gives us deterministic segment
 * names, numbering that survives process restarts, and automatic cleanup under
 * `fullReset` — without a Toast. Each stop therefore writes a numbered segment
 * rather than a single fixed file: one test can profile several app processes
 * (specs that restart the app) and background the app several times (OAuth
 * hand-offs), and every one of those produces its own trace.
 *
 * `dumpSampledTraceToFile` clears the sample buffer after writing, so segments
 * never overlap. On RN 0.83.6 `HermesSamplingProfiler.disable()` is JNI-bound
 * to `enable()` (fixed upstream on main), so `disable` is currently a no-op and
 * the sampler keeps running across segments; when RN ships the fix, `disable`
 * will genuinely stop it and the re-arm `enable()` restarts it. Either way the
 * dump-then-disable order here is correct.
 */
class HermesProfilerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun startProfiling(promise: Promise) {
        try {
            HermesSamplingProfiler.enable()
            promise.resolve(true)
        } catch (error: Throwable) {
            promise.reject(ERROR_CODE, error)
        }
    }

    /**
     * Drops samples taken before the measured flow. The trace is dumped only
     * so Hermes clears its buffer, then deleted. `disable` is intentionally
     * not called: the sampler must keep running, and on current RN it is a
     * no-op anyway.
     */
    @ReactMethod
    fun discardProfilingSamples(promise: Promise) {
        val scratchFile =
            try {
                File(requireDocumentsDirectory(), SCRATCH_FILE_NAME)
            } catch (error: Throwable) {
                promise.reject(ERROR_CODE, error)
                return
            }

        try {
            scratchFile.delete()
            HermesSamplingProfiler.dumpSampledTraceToFile(scratchFile.absolutePath)
            promise.resolve(true)
        } catch (error: Throwable) {
            promise.reject(ERROR_CODE, error)
        } finally {
            scratchFile.delete()
        }
    }

    /**
     * Confirms the measured window is open. The test polls this file instead
     * of sleeping. The second line is the highest segment already on disk so
     * those setup traces are not collected.
     */
    @ReactMethod
    fun markProfilingArmed(nonce: String, promise: Promise) {
        try {
            val documentsDirectory = requireDocumentsDirectory()
            val marker = File(documentsDirectory, ARMED_FILE_NAME)
            marker.writeText("$nonce\n${highestSegmentIndex(documentsDirectory)}\n")
            promise.resolve(true)
        } catch (error: Throwable) {
            promise.reject(ERROR_CODE, error)
        }
    }

    @ReactMethod
    fun stopProfilingToAppStorage(promise: Promise) {
        try {
            val documentsDirectory = requireDocumentsDirectory()
            val outputFile =
                File(documentsDirectory, segmentFileName(nextSegmentIndex(documentsDirectory)))

            // Hermes streams the trace out, so a reader watching the directory
            // can observe a partial file. Dump to a scratch name and rename it
            // once the write is known to be complete: the test side polls for
            // segment files and treats their presence as "safe to pull".
            val scratchFile = File(documentsDirectory, SCRATCH_FILE_NAME)
            scratchFile.delete()

            HermesSamplingProfiler.dumpSampledTraceToFile(scratchFile.absolutePath)
            HermesSamplingProfiler.disable()

            if (!scratchFile.isFile || scratchFile.length() == 0L) {
                throw IllegalStateException(
                    "Hermes wrote no trace to ${scratchFile.absolutePath}"
                )
            }
            if (!scratchFile.renameTo(outputFile)) {
                throw IllegalStateException(
                    "Could not move the trace to ${outputFile.absolutePath}"
                )
            }

            promise.resolve(outputFile.absolutePath)
        } catch (error: Throwable) {
            promise.reject(ERROR_CODE, error)
        }
    }

    private fun requireDocumentsDirectory(): File {
        val directory =
            reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
                ?: throw IllegalStateException("App-scoped external storage is unavailable")
        directory.mkdirs()
        return directory
    }

    /**
     * Segments are numbered across app processes rather than within one. A spec
     * that restarts the app profiles each process separately, and the restarted
     * process must not reuse an index whose file the test has not pulled yet.
     */
    private fun highestSegmentIndex(directory: File): Int =
        directory
            .listFiles()
            ?.mapNotNull {
                SEGMENT_FILE_PATTERN.matchEntire(it.name)?.groupValues?.get(1)?.toIntOrNull()
            }
            ?.maxOrNull()
            ?: 0

    private fun nextSegmentIndex(directory: File): Int = highestSegmentIndex(directory) + 1

    private fun segmentFileName(index: Int): String =
        "$PROFILE_FILE_PREFIX.segment-$index.cpuprofile"

    companion object {
        const val NAME = "MetaMaskHermesProfiler"
        private const val ERROR_CODE = "hermes_profiler_error"
        private const val PROFILE_FILE_PREFIX = "metamask-performance"
        private const val SCRATCH_FILE_NAME = "$PROFILE_FILE_PREFIX.pending"
        private const val ARMED_FILE_NAME = "$PROFILE_FILE_PREFIX.armed"
        private val SEGMENT_FILE_PATTERN =
            Regex("""metamask-performance\.segment-(\d+)\.cpuprofile""")
    }
}
