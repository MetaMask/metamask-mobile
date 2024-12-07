package io.metamask;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import io.branch.rnbranch.*;
import android.content.Intent;
import android.os.Bundle;
import java.util.ArrayList;
import java.util.Arrays;

class MainActivity : ReactActivity()  {

	/**
	* Returns the name of the main component registered from JavaScript. This is used to schedule
	* rendering of the component.
	*/
	override fun getMainComponentName(): String = "MetaMask";
	

	// Override onStart, onNewIntent:
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
            if activity is in foreground (or in backstack but partially visible) launch the same
            activity will skip onStart, handle this case with reInit
            if reInit() is called without this flag, you will see the following message:
            BRANCH_SDK: Warning. Session initialization already happened.
            To force a new session,
            set intent extra, "branch_force_new_session", to true.
        */
        if (intent.hasExtra("branch_force_new_session") &&
            intent.getBooleanExtra("branch_force_new_session", false)
        ) {
            RNBranchModule.onNewIntent(intent)
        }
    }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
	return object : DefaultReactActivityDelegate(
		this,
		mainComponentName,
		DefaultNewArchitectureEntryPoint.fabricEnabled
	) {
		override fun getLaunchOptions(): Bundle {
			return Bundle().apply {
				putString("foxCode", BuildConfig.foxCode ?: "debug")
			}
		}
	}
}
}
