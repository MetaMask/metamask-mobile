package com.metamask;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactFragmentActivity;
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
		RNBranchModule.initSession(getIntent().getData(), this);
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
                bundle.putString("foxCode", BuildConfig.foxCode);
                return bundle;
            }
        };
	}

}
