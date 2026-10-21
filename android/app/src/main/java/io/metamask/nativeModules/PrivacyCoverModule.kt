package io.metamask.nativeModules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * Native bridge for [PrivacyCover]. `hide` dismisses the cover once JavaScript
 * resume routing has resolved. `waitUntilAuthenticationReady` resolves after
 * `onPostResume`, which is when Android will accept a biometric prompt.
 * Showing the cover stays on the activity lifecycle.
 */
class PrivacyCoverModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "PrivacyCoverModule"

    @ReactMethod
    fun hide() {
        UiThreadUtil.runOnUiThread { PrivacyCover.hide() }
    }

    /**
     * Resolves once [android.app.Activity.onPostResume] has run for the
     * current resume. Rejects if [android.app.Activity.onPause] invalidates
     * that resume first.
     */
    @ReactMethod
    fun waitUntilAuthenticationReady(promise: Promise) {
        UiThreadUtil.runOnUiThread { PrivacyCover.waitUntilAuthenticationReady(promise) }
    }
}
