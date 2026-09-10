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
 * ordering is known to work against the prebuilt `hermes-android` artifact. The
 * only deviation is the destination: RC copies to the shared Downloads
 * collection via MediaStore, which Appium cannot read back, so we write to
 * app-scoped external storage instead. That path is inside the app sandbox and
 * is therefore retrievable with `pullFile` on a non-rooted BrowserStack device.
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

    @ReactMethod
    fun stopProfilingToAppStorage(promise: Promise) {
        try {
            val documentsDirectory =
                reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
                    ?: throw IllegalStateException("App-scoped external storage is unavailable")
            documentsDirectory.mkdirs()

            val outputFile = File(documentsDirectory, PROFILE_FILE_NAME)
            outputFile.delete()

            HermesSamplingProfiler.dumpSampledTraceToFile(outputFile.absolutePath)
            HermesSamplingProfiler.disable()

            if (!outputFile.isFile || outputFile.length() == 0L) {
                throw IllegalStateException(
                    "Hermes wrote no trace to ${outputFile.absolutePath}"
                )
            }

            promise.resolve(outputFile.absolutePath)
        } catch (error: Throwable) {
            promise.reject(ERROR_CODE, error)
        }
    }

    companion object {
        const val NAME = "MetaMaskHermesProfiler"
        private const val ERROR_CODE = "hermes_profiler_error"
        private const val PROFILE_FILE_NAME = "metamask-performance.cpuprofile"
    }
}
