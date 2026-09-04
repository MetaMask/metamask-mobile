package io.metamask.nativeModules

import com.braze.Braze
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BrazePushModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "BrazePushModule"

    @ReactMethod
    fun unregisterPush(promise: Promise) {
        try {
            Braze.getInstance(reactApplicationContext).unregisterPush { result ->
                result.fold(
                    onSuccess = {
                        promise.resolve(null)
                    },
                    onFailure = { error ->
                        if (isNoPushTokenError(error)) {
                            promise.resolve(null)
                        } else {
                            promise.reject(CODE_UNREGISTER_FAILED, error.message, error)
                        }
                    },
                )
            }
        } catch (error: Exception) {
            promise.reject(CODE_SDK_UNAVAILABLE, "Braze is not initialized", error)
        }
    }

    private fun isNoPushTokenError(error: Throwable): Boolean =
        error.message?.contains("no push token", ignoreCase = true) == true

    companion object {
        private const val CODE_SDK_UNAVAILABLE = "SDK_UNAVAILABLE"
        private const val CODE_UNREGISTER_FAILED = "UNREGISTER_FAILED"
    }
}
