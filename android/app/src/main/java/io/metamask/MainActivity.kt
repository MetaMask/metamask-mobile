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
import com.braze.reactbridge.BrazeReactUtils

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Capture Notification Intent
        NotificationModule.saveNotificationIntent(intent)
        BrazeReactUtils.populateInitialPushPayloadFromIntent(intent)

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
        BrazeReactUtils.populateInitialPushPayloadFromIntent(intent)

        super.onNewIntent(intent)
        setIntent(intent)

        /*
         * Only reinit Branch when the caller explicitly flagged the intent with
         * `branch_force_new_session=true` (intra-app deeplinks, push notifications).
         *
         * For external deeplinks on a singleTask activity, Android always calls
         * onStart() right after onNewIntent(), and our onStart() handler already
         * calls RNBranchModule.initSession(). Calling reInit() here as well would
         * cause `branch.subscribe` to fire twice, which in turn opens the same
         * deeplink twice.
         *
         * See: https://help.branch.io/developers-hub/docs/android-basic-integration
         */
        if (intent.hasExtra("branch_force_new_session") &&
            intent.getBooleanExtra("branch_force_new_session", false)) {
            RNBranchModule.onNewIntent(intent)
        }
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