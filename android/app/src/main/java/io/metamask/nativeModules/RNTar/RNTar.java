package io.metamask.nativeModules.RNTar;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;
import android.util.Log;
import com.facebook.react.bridge.Promise;


public class RNTar extends ReactContextBaseJavaModule {
  private static String MODULE_NAME = "RNTar";

  RNTar(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  private String uncompressTgzFile(String atPath, String toDirectory) {
    return "Temp";
  };
  @ReactMethod
  public void unTar(String pathToRead, String pathToWrite, final Promise promise) {
    Log.d(MODULE_NAME, "Create event called with name: " + pathToRead
      + " and location: " + pathToWrite);
    try {
      promise.resolve("source/code");
    } catch(Exception e) {
      promise.reject("Error uncompressing file:", e);
    }
  }
}
