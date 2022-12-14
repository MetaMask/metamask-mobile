package io.metamask;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactActivity;
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
	protected void onStart() {
		super.onStart();
		RNBranchModule.initSession(getIntent().getData(), this);

		try{
			ApplicationInfo ai = this.getPackageManager().getApplicationInfo(this.getPackageName(), PackageManager.GET_META_DATA);
			String mixpanelToken = (String)ai.metaData.get("com.mixpanel.android.mpmetrics.MixpanelAPI.token");
			MixpanelAPI.getInstance(this, mixpanelToken);
		}catch (PackageManager.NameNotFoundException e){
			Log.d("RCTAnalytics","init:token missing");
		}
	}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		SplashScreen.show(this);
		super.onCreate(null);
	}

	@Override
	public void onNewIntent(Intent intent) {
			super.onNewIntent(intent);
				/*
					if activity is in foreground (or in backstack but partially visible) launch the same
					activity will skip onStart, handle this case with reInit
					if reInit() is called without this flag, you will see the following message: 
					BRANCH_SDK: Warning. Session initialization already happened. 
					To force a new session, 
					set intent extra, "branch_force_new_session", to true.
			*/
			if (intent != null && 
				intent.hasExtra("branch_force_new_session") &&
				intent.getBooleanExtra("branch_force_new_session", false)) {
					RNBranchModule.onNewIntent(intent);
				}
	}
	
	@Override
	protected ReactActivityDelegate createReactActivityDelegate() {
		return new ReactActivityDelegate(this, getMainComponentName()) {
			@NonNull
			@Override
			protected Bundle getLaunchOptions() {
				Bundle bundle = new Bundle();
				if(BuildConfig.foxCode != null){
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
