package io.metamask

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import io.branch.rnbranch.RNBranchModule
import io.metamask.nativeModules.NotificationModule

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Capture Notification Intent
        NotificationModule.saveNotificationIntent(intent)

        // Set the theme to AppTheme BEFORE onCreate to support
        // coloring the background, status bar, and navigation bar.
        // This is required for expo-splash-screen.
        setTheme(R.style.AppTheme)
        super.onCreate(null)
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "MetaMask"

    // Branch.io integration
    override fun onStart() {
        super.onStart()
        RNBranchModule.initSession(intent.data, this)
    }

    override fun onNewIntent(intent: Intent) {
        // Capture New Notification Intent
        NotificationModule.saveNotificationIntent(intent)

        super.onNewIntent(intent)
        /*
         * if activity is in foreground (or in backstack but partially visible) launch the same
         * activity will skip onStart, handle this case with reInit
         * if reInit() is called without this flag, you will see the following message:
         * BRANCH_SDK: Warning. Session initialization already happened.
         * To force a new session,
         * set intent extra, "branch_force_new_session", to true.
         */
      intent.putExtra("branch_force_new_session", true)
      RNBranchModule.onNewIntent(intent);
    }

    /**
    * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
    * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
    */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ){
                override fun getLaunchOptions(): Bundle {
                    return Bundle().apply {
                        putString(
                            "foxCode",
                            BuildConfig.foxCode ?: "debug"
                        )
                    }
                }
            }
        )
    }

    /**
     * Align the back button behavior with Android S
     * where moving root activities to background instead of finishing activities.
     * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
     */
    override fun invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                // For non-root activities, use the default implementation to finish them.
                super.invokeDefaultOnBackPressed()
            }
            return
        }

        // Use the default back button implementation on Android S
        // because it's doing more than [Activity.moveTaskToBack] in fact.
        super.invokeDefaultOnBackPressed()
    }
} 