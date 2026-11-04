package io.metamask.nativeModules.PerfSession

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS bridge for [PerfSession]. Sampling starts natively in MainApplication so cold
 * start is covered; JS reports the focused screen and, about once a second, its
 * own stats (see app/core/Performance/perfSession.ts).
 */
class PerfSessionModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "MetaMaskPerfSession"

    @ReactMethod
    fun setScreen(name: String) {
        PerfSession.setScreen(name)
    }

    /** Resolves with the JS-side features the collector currently enables, as JSON. */
    @ReactMethod
    fun report(json: String, promise: Promise) {
        promise.resolve(PerfSession.reportFromJs(json))
    }

    /** The shake-to-profile ProfilerManager is recording; pause automatic profiles. */
    @ReactMethod
    fun setManualProfiling(active: Boolean) {
        PerfSession.setManualProfiling(active)
    }
}
