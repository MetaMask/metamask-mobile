package io.metamask;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import com.mixpanel.android.mpmetrics.MixpanelAPI;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

import io.branch.rnbranch.*;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;

import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

	long onCreateS;
	long onStartS;
	long totalS;

	/**
	 * Returns the name of the main component registered from JavaScript. This is used to schedule
	 * rendering of the component.
	 */
	@Override
	protected String getMainComponentName() {
		return "MetaMask";
	}

	// Override onStart, onNewIntent:

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		totalS = System.currentTimeMillis();
		onCreateS = System.currentTimeMillis();
		SplashScreen.show(this);
		super.onCreate(null);
		Log.i(MainActivity.class.getSimpleName() + " MM onCreate", Long.toString(System.currentTimeMillis() - onCreateS));
	}

	@Override
	protected void onStart() {
		onStartS = System.currentTimeMillis();

		super.onStart();

		new Runnable(){
			@Override
			public void run() {
				RNBranchModule.initSession(getIntent().getData(), MainActivity.this);
				try {
					ApplicationInfo ai = MainActivity.this.getPackageManager().getApplicationInfo(MainActivity.this.getPackageName(), PackageManager.GET_META_DATA);
					String mixpanelToken = (String) ai.metaData.get("com.mixpanel.android.mpmetrics.MixpanelAPI.token");
					MixpanelAPI.getInstance(MainActivity.this, mixpanelToken);
				} catch (PackageManager.NameNotFoundException e) {
					Log.d("RCTAnalytics", "init:token missing");
				}
			}
		};

		Log.i(MainActivity.class.getSimpleName() + " MM onStart", Long.toString(System.currentTimeMillis() - onStartS));
		Log.i(MainActivity.class.getSimpleName() + " MM total", Long.toString(System.currentTimeMillis() - totalS));
	}

	@Override
	public void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
		setIntent(intent);
	}

	@Override
	protected ReactActivityDelegate createReactActivityDelegate() {
		return new ReactActivityDelegate(this, getMainComponentName()) {
			@NonNull
			@Override
			protected Bundle getLaunchOptions() {
				Bundle bundle = new Bundle();
				if (BuildConfig.foxCode != null) {
					bundle.putString("foxCode", BuildConfig.foxCode);
				} else {
					bundle.putString("foxCode", "debug");
				}
				return bundle;
			}

			@Override
			protected ReactRootView createRootView() {
				return new RNGestureHandlerEnabledRootView(MainActivity.this);
			}
		};
	}


}
