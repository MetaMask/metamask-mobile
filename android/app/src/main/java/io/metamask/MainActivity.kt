package io.metamask

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import io.branch.rnbranch.RNBranchModule

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "MetaMask"

    override fun onStart() {
        super.onStart()
        RNBranchModule.initSession(intent.data, this)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        /*
         * if activity is in foreground (or in backstack but partially visible) launch the same
         * activity will skip onStart, handle this case with reInit
         * if reInit() is called without this flag, you will see the following message:
         * BRANCH_SDK: Warning. Session initialization already happened.
         * To force a new session,
         * set intent extra, "branch_force_new_session", to true.
         */
        if (intent.hasExtra("branch_force_new_session") &&
            intent.getBooleanExtra("branch_force_new_session", false)
        ) {
            RNBranchModule.onNewIntent(intent)
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                DefaultNewArchitectureEntryPoint.getFabricEnabled()
            ) {
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