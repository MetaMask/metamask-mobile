package io.metamask

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import expo.modules.ReactActivityDelegateWrapper
import io.branch.rnbranch.RNBranchModule
import io.metamask.BuildConfig

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Set the theme BEFORE onCreate to support expo‑splash‑screen
        setTheme(R.style.AppTheme)
        super.onCreate(null)
    }

    override fun getMainComponentName(): String = "MetaMask"

    // Branch.io integration
    override fun onStart() {
        super.onStart()
        RNBranchModule.initSession(intent.data, this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.putExtra("branch_force_new_session", true)
        RNBranchModule.onNewIntent(intent)
    }

    /**
     * Build the delegate wrapper for the New Architecture.
     * Here we override onHostPause/onHostResume to catch *any* time
     * the React host loses or gains focus (Recents, Home, lock screen, etc.)
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {
                override fun onHostPause() {
                    super.onHostPause()
                    emitWindowFocusChanged(false)
                }
                override fun onHostResume() {
                    super.onHostResume()
                    emitWindowFocusChanged(true)
                }
            }
        )
    }

    /**
     * Helper to emit the event into JS
     */
    private fun emitWindowFocusChanged(hasFocus: Boolean) {
        Log.d("MainActivity", "emitWindowFocusChanged – hasFocus=$hasFocus")
        val reactContext: ReactContext? =
            reactNativeHost
                .reactInstanceManager
                .currentReactContext

        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("windowFocusChanged", hasFocus)
    }

    /**
     * Align the back button behavior with Android S
     */
    override fun invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                super.invokeDefaultOnBackPressed()
            }
            return
        }
        super.invokeDefaultOnBackPressed()
    }
}
