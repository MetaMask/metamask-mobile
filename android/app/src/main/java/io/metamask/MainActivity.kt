package io.metamask

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import io.branch.rnbranch.RNBranchModule
import org.devio.rn.splashscreen.SplashScreen

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String? {
        return "MetaMask"
    }

    // Override onStart, onNewIntent:
    override fun onStart() {
        super.onStart()
        RNBranchModule.initSession(intent.data, this)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        SplashScreen.show(this)
        super.onCreate(null)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        /*
				if activity is in foreground (or in backstack but partially visible) launch the same
				activity will skip onStart, handle this case with reInit
				if reInit() is called without this flag, you will see the following message:
				BRANCH_SDK: Warning. Session initialization already happened.
				To force a new session,
				set intent extra, "branch_force_new_session", to true.
		*/if (intent != null &&
                intent.hasExtra("branch_force_new_session") &&
                intent.getBooleanExtra("branch_force_new_session", false)) {
            RNBranchModule.onNewIntent(intent)
        }
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [ ] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : DefaultReactActivityDelegate(this, mainComponentName!!, fabricEnabled) {
            override fun getLaunchOptions(): Bundle? {
                val initialProperties = Bundle()
                if (BuildConfig.foxCode != null) {
                    initialProperties.putString("foxCode", BuildConfig.foxCode)
                } else {
                    initialProperties.putString("foxCode", "debug")
                }
                return initialProperties
            }
        }
    }
}
