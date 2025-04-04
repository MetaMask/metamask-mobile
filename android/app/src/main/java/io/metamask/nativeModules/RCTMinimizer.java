package io.metamask.nativeModules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.util.Log;

public class RCTMinimizer extends ReactContextBaseJavaModule {
  private ReactApplicationContext reactContext;
  RCTMinimizer(ReactApplicationContext context) {
    super(context);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "Minimizer";
  }

  @ReactMethod
  public void goBack() {
    android.app.Activity activity = getCurrentActivity();
    if (activity != null) {
      activity.moveTaskToBack(true);
    }
  }
}
