package io.metamask.nativeModules;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;

import androidx.annotation.RequiresApi;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class CallDetection extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;
    private TelephonyCallback telephonyCallback;
    private boolean isOnCall = false;
    private int listenerCount = 0;

    CallDetection(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        telephonyManager = (TelephonyManager) context.getSystemService(ReactApplicationContext.TELEPHONY_SERVICE);
    }

    @Override
    public String getName() {
        return "RCTCallDetection";
    }

    private boolean hasPermission() {
        return ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_PHONE_STATE)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void sendEvent(boolean isOnCall) {
        this.isOnCall = isOnCall;
        WritableMap params = Arguments.createMap();
        params.putBoolean("isOnCall", isOnCall);
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onCallStateChanged", params);
    }

    @ReactMethod
    public void addListener(String eventName) {
        listenerCount++;
        if (listenerCount == 1) {
            startListening();
        }
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        listenerCount -= count;
        if (listenerCount <= 0) {
            listenerCount = 0;
            stopListening();
        }
    }

    private void startListening() {
        if (!hasPermission() || telephonyManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            startTelephonyCallback();
        } else {
            startPhoneStateListener();
        }
    }

    private void stopListening() {
        if (telephonyManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (telephonyCallback != null) {
                telephonyManager.unregisterTelephonyCallback(telephonyCallback);
                telephonyCallback = null;
            }
        } else {
            if (phoneStateListener != null) {
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
                phoneStateListener = null;
            }
        }
    }

    @SuppressWarnings("deprecation")
    private void startPhoneStateListener() {
        phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String phoneNumber) {
                boolean onCall = state != TelephonyManager.CALL_STATE_IDLE;
                sendEvent(onCall);
            }
        };
        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private abstract static class CallStateCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {}

    @RequiresApi(api = Build.VERSION_CODES.S)
    private void startTelephonyCallback() {
        telephonyCallback = new CallStateCallback() {
            @Override
            public void onCallStateChanged(int state) {
                boolean onCall = state != TelephonyManager.CALL_STATE_IDLE;
                sendEvent(onCall);
            }
        };
        telephonyManager.registerTelephonyCallback(reactContext.getMainExecutor(), telephonyCallback);
    }

    @ReactMethod
    public void checkCallState(Promise promise) {
        if (!hasPermission()) {
            promise.resolve(false);
            return;
        }

        if (telephonyManager != null) {
            int state = telephonyManager.getCallState();
            isOnCall = state != TelephonyManager.CALL_STATE_IDLE;
        }
        promise.resolve(isOnCall);
    }
}
