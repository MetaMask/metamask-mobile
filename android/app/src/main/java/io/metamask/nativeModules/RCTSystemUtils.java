package io.metamask.nativeModules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

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
	public void getCurrentWebViewPackage(Promise promise) {
		if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
			promise.resolve("getCurrentWebViewPackage");
		}
	}
}
