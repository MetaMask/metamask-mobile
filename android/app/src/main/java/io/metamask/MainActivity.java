package io.metamask;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactFragmentActivity;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

import io.branch.rnbranch.*;
import android.content.Intent;
import android.os.Bundle;
import android.support.annotation.Nullable;

public class MainActivity extends ReactFragmentActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "MetaMask";
	}

	// Override onStart, onNewIntent:
	@Override
	protected void onStart() {
		super.onStart();
		if(!BuildConfig.DEBUG){
			RNBranchModule.initSession(getIntent().getData(), this);
		}
	}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(null);
	}
	@Override
	public void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
		setIntent(intent);
	}

	@Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegate(this, getMainComponentName()) {
            @Nullable
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
