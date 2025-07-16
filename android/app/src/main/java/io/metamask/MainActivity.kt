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

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Set the theme before onCreate for expo‑splash‑screen
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
     * Fired when window focus changes (e.g. Recent‑Apps opened/closed).  
     */
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)

        // log to Logcat so we can verify this is being called
        Log.d("MainActivity", "onWindowFocusChanged – hasFocus=$hasFocus")

        // grab the ReactContext from the built‑in reactNativeHost
        val reactContext: ReactContext? =
            reactNativeHost
                .reactInstanceManager
                .currentReactContext

        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("windowFocusChanged", hasFocus)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {
                override fun getLaunchOptions(): Bundle {
                    return Bundle().apply {
                        putString("foxCode", BuildConfig.foxCode ?: "debug")
                    }
                }
            }
        )
    }

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
