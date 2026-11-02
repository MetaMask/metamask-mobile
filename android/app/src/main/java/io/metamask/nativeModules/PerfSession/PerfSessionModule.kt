package io.metamask.nativeModules.PerfSession

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS bridge for [PerfSession]. Sampling starts natively in MainApplication so cold
 * start is covered; JS only reports which screen is focused.
 */
class PerfSessionModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "MetaMaskPerfSession"

    @ReactMethod
    fun setScreen(name: String) {
        PerfSession.setScreen(name)
    }
}
