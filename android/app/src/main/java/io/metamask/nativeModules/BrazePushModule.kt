package io.metamask.nativeModules

import com.braze.Braze
import com.braze.push.BrazePushUnregistrationException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BrazePushModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "BrazePushModule"

    @ReactMethod
    fun registerPush(fcmToken: String, promise: Promise) {
        if (fcmToken.isBlank()) {
            promise.reject(CODE_INVALID_TOKEN, "FCM token is empty")
            return
        }

        try {
            Braze.getInstance(reactApplicationContext).registeredPushToken = fcmToken
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject(CODE_SDK_UNAVAILABLE, "Braze is not initialized", error)
        }
    }

    @ReactMethod
    fun unregisterPush(promise: Promise) {
        try {
            Braze.getInstance(reactApplicationContext).unregisterPush { result ->
                result.fold(
                    onSuccess = {
                        promise.resolve(successResult())
                    },
                    onFailure = { error ->
                        if (isNoPushTokenError(error)) {
                            promise.resolve(successResult())
                        } else {
                            promise.resolve(failureResult(error))
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

    private fun successResult() =
        Arguments.createMap().apply {
            putBoolean("success", true)
        }

    private fun failureResult(error: Throwable) =
        Arguments.createMap().apply {
            val pushError = error as? BrazePushUnregistrationException
            putBoolean("success", false)
            putString("message", error.message ?: "Failed to unregister Braze push")
            putBoolean("isRetriable", pushError?.isRetriable == true)
            pushError?.httpStatusCode?.let { putInt("httpStatusCode", it) }
        }

    companion object {
        private const val CODE_INVALID_TOKEN = "INVALID_TOKEN"
        private const val CODE_SDK_UNAVAILABLE = "SDK_UNAVAILABLE"
    }
}
