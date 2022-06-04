package io.metamask.nativeModules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import android.webkit.WebView;
import android.content.pm.PackageInfo;

public class RCTSystemUtils extends ReactContextBaseJavaModule {
	private final ReactApplicationContext reactContext;

	public RCTSystemUtils(ReactApplicationContext context) {
		super(context);
		reactContext = context;
	}

	@Override
	public String getName() {
		return "SystemUtils";
	}

	@ReactMethod
	public void getCurrentWebViewPackageVersionName(Promise promise) {
		if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
			PackageInfo info = WebView.getCurrentWebViewPackage();
			promise.resolve(info.versionName);
		}
	}
}
