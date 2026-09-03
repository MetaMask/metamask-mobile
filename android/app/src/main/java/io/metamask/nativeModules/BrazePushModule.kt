package io.metamask.nativeModules

import com.braze.Braze
import com.braze.push.BrazePushUnregistrationException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class BrazePushModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "BrazePushModule"

    @ReactMethod
    fun unregisterPush(promise: Promise) {
        try {
            Braze.getInstance(reactApplicationContext).unregisterPush { result ->
                result.fold(
                    onSuccess = {
                        promise.resolve(successMap())
                    },
                    onFailure = { error ->
                        promise.resolve(failureMap(error))
                    },
                )
            }
        } catch (error: Exception) {
            promise.resolve(
                failureMap(
                    code = CODE_SDK_UNAVAILABLE,
                    isRetriable = false,
                    message = error.message ?: "Braze is not initialized",
                ),
            )
        }
    }

    private fun successMap(): WritableMap =
        Arguments.createMap().apply {
            putBoolean("success", true)
        }

    private fun failureMap(error: Throwable): WritableMap {
        val message = error.message ?: "Braze push unregister failed"
        val unregistrationError = error as? BrazePushUnregistrationException
        return failureMap(
            code = failureCode(unregistrationError, message),
            isRetriable = unregistrationError?.isRetriable ?: false,
            message = message,
        )
    }

    private fun failureCode(
        unregistrationError: BrazePushUnregistrationException?,
        message: String,
    ): String {
        if (message.contains("no push token", ignoreCase = true)) {
            return CODE_NO_PUSH_TOKEN
        }
        return if (unregistrationError != null) CODE_REQUEST_FAILED else CODE_UNKNOWN
    }

    private fun failureMap(
        code: String,
        isRetriable: Boolean,
        message: String,
    ): WritableMap =
        Arguments.createMap().apply {
            putBoolean("success", false)
            putBoolean("isRetriable", isRetriable)
            putString("code", code)
            putString("message", message)
        }

    companion object {
        private const val CODE_SDK_UNAVAILABLE = "SDK_UNAVAILABLE"
        private const val CODE_NO_PUSH_TOKEN = "NO_PUSH_TOKEN"
        private const val CODE_REQUEST_FAILED = "REQUEST_FAILED"
        private const val CODE_UNKNOWN = "UNKNOWN"
    }
}
