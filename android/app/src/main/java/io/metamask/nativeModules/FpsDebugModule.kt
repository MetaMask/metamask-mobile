package io.metamask.nativeModules

import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.devsupport.interfaces.DevSupportManager
import java.lang.ref.WeakReference

class FpsDebugModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val reactApplicationContext = WeakReference(reactContext)

  override fun getName(): String {
    return "FpsDebugModule"
  }

  @ReactMethod
  fun setFpsDebugEnabled(enabled: Boolean, promise: Promise) {
    try {
      val context = reactApplicationContext.get()
      val reactApp = context?.applicationContext as? ReactApplication
      val devSupportManager = reactApp?.reactNativeHost?.reactInstanceManager?.devSupportManager
      if (devSupportManager == null) {
        promise.reject("DEV_MANAGER_NULL", "Dev support manager is null")
        return
      }

      val currentSetting = devSupportManager.devSupportEnabled
      devSupportManager.devSupportEnabled = true

      Log.d("FpsDebugModule", "FPS currentSetting: $currentSetting")

      devSupportManager.setFpsDebugEnabled(enabled)

      devSupportManager.devSupportEnabled = currentSetting

      promise.resolve(enabled)
      Log.d("FpsDebugModule", "FPS debug enabled: $enabled")

    } catch (e: Exception) {
      Log.e("FpsDebugModule", "Error setting FPS debug enabled", e)
      promise.reject("SET_FPS_DEBUG_ERROR", "Failed to set FPS debug enabled: ${e.message}", e)
    }
  }

  @ReactMethod
  fun isFpsDebugEnabled(promise: Promise) {
    try {
      val context = reactApplicationContext.get()
      val reactApp = context?.applicationContext as? ReactApplication
      val devSupportManager = reactApp?.reactNativeHost?.reactInstanceManager?.devSupportManager
      if (devSupportManager == null) {
        promise.reject("DEV_MANAGER_NULL", "Dev support manager is null")
        return
      }


      val isEnabled = devSupportManager.devSettings?.isFpsDebugEnabled
      promise.resolve(isEnabled)

    } catch (e: Exception) {
      Log.e("FpsDebugModule", "Error getting FPS debug enabled state", e)
      promise.reject(
        "GET_FPS_DEBUG_ERROR",
        "Failed to get FPS debug enabled state: ${e.message}",
        e
      )
    }
  }
}
