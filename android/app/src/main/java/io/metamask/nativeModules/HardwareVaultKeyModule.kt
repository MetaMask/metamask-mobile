package io.metamask.nativeModules

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.security.keystore.StrongBoxUnavailableException
import android.security.keystore.UserNotAuthenticatedException
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * HardwareVaultKey — per-install, hardware-backed, user-authenticated AEAD for
 * wallet credentials.
 *
 * Key properties:
 *  - 256-bit AES-GCM, StrongBox-backed when available (falls back to TEE).
 *  - setUserAuthenticationRequired(true) + a short validity window: the key is
 *    usable for AUTH_VALIDITY_SECONDS after any user authentication event
 *    (e.g. device unlock). This lets the encrypt-on-save path proceed without
 *    an extra prompt when the user just unlocked the device (avoiding save-time
 *    UX cost), while still requiring auth for decrypt outside that window.
 *  - setInvalidatedByBiometricEnrollment(false): enrolling/changing biometrics
 *    does NOT invalidate the wrapping key, avoiding a forced re-login (product
 *    decision: avoid UX cost). Tradeoff: a newly-enrolled biometric can also
 *    unlock the key; acceptable because device passcode remains a gate.
 *
 * Auth flow: cipher operations throw UserNotAuthenticatedException outside the
 * validity window; we then present a BiometricPrompt (BIOMETRIC_STRONG |
 * DEVICE_CREDENTIAL) and retry the operation once authenticated.
 *
 * Tradeoff note: this uses a validity window rather than a per-operation
 * BiometricPrompt.CryptoObject, so the prompt is not cryptographically bound
 * to the Cipher. This still defeats the stated offline at-rest attacker (who
 * cannot authenticate at all) and avoids a save-time prompt. If per-operation
 * hardware-bound auth is later required, switch to CryptoObject and remove the
 * validity window (accepting a prompt on save).
 *
 * The blob's `purpose` is bound as AES-GCM AAD so a blob for one scope cannot
 * be replayed against another.
 *
 * Degraded fallback: if no BIOMETRIC_STRONG/DEVICE_CREDENTIAL auth is
 * available, isAvailable() returns false and the JS layer falls back to the
 * legacy foxCode path (documented risk).
 *
 * Serialized blob (stored as the keychain item value by the JS layer):
 * { "v": 1, "alg": "AES-GCM-256", "ct": "<base64 ct+tag>", "iv": "<base64 nonce>",
 *   "purpose": "<purpose>", "hw": "android-keystore" }
 */
class HardwareVaultKeyModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS_PREFIX = "mm.wallet.hw."
        private const val GCM_TAG_BITS = 128
        private const val BLOB_VERSION = 1
        // Key is usable for this many seconds after a user auth event (e.g.
        // device unlock), so the encrypt-on-save path is prompt-free when the
        // user just unlocked the device. Outside the window, cipher ops throw
        // UserNotAuthenticatedException and we present a BiometricPrompt.
        private const val AUTH_VALIDITY_SECONDS = 10
    }

    override fun getName(): String = "HardwareVaultKey"

    /** Returns the key alias for a given purpose (per-purpose key binding). */
    private fun aliasFor(purpose: String): String = KEY_ALIAS_PREFIX + purpose

    /** Lazily creates or loads the AES-GCM key for a purpose. */
    @Synchronized
    private fun getOrCreateKey(purpose: String): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (ks.getKey(aliasFor(purpose), null) as? SecretKey)?.let { return it }

        val builder = KeyGenParameterSpec.Builder(
            aliasFor(purpose),
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(AUTH_VALIDITY_SECONDS)
            .setInvalidatedByBiometricEnrollment(false)
            .setRandomizedEncryptionRequired(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            builder.setIsStrongBoxBacked(true)
        }

        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        return try {
            gen.init(builder.build())
            gen.generateKey()
        } catch (e: StrongBoxUnavailableException) {
            // No StrongBox on this device; retry with TEE-backed key.
            builder.setIsStrongBoxBacked(false)
            gen.init(builder.build())
            gen.generateKey()
        }
    }

    /** True when biometric or device-passcode auth (Class3) is available. */
    private fun canAuthenticate(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
        val bm = BiometricManager.from(reactContext)
        val authenticators =
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        return bm.canAuthenticate(authenticators) == BiometricManager.BIOMETRIC_SUCCESS
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(canAuthenticate())
    }

    @ReactMethod
    fun getBackend(promise: Promise) {
        promise.resolve("android-keystore")
    }

    @ReactMethod
    fun encrypt(purpose: String, plaintext: String, promise: Promise) {
        runWithAuth(purpose, promise) { key ->
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key)
            cipher.updateAAD(purpose.toByteArray(Charsets.UTF_8))
            val ct = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
            serializeBlob(ct, cipher.iv, purpose)
        }
    }

    @ReactMethod
    fun decrypt(purpose: String, blob: String, promise: Promise) {
        val parsed = try {
            JSONObject(blob)
        } catch (e: Exception) {
            promise.reject("BAD_BLOB", e.message, e)
            return
        }
        val blobPurpose = parsed.getString("purpose")
        if (blobPurpose != purpose) {
            promise.reject("PURPOSE_MISMATCH", "blob purpose does not match")
            return
        }
        val ct = Base64.getDecoder().decode(parsed.getString("ct"))
        val iv = Base64.getDecoder().decode(parsed.getString("iv"))

        runWithAuth(purpose, promise) { key ->
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, iv))
            cipher.updateAAD(purpose.toByteArray(Charsets.UTF_8))
            String(cipher.doFinal(ct), Charsets.UTF_8)
        }
    }

    @ReactMethod
    fun clear(purpose: String, promise: Promise) {
        try {
            val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            val alias = aliasFor(purpose)
            val deleted = if (ks.containsAlias(alias)) {
                ks.deleteEntry(alias)
                true
            } else {
                false
            }
            promise.resolve(deleted)
        } catch (e: Exception) {
            promise.reject("CLEAR_FAILED", e.message, e)
        }
    }

    /**
     * Runs a cipher operation [op] that needs the hardware key. If the key
     * cannot be used because the user has not authenticated recently
     * (UserNotAuthenticatedException outside the validity window), presents a
     * BiometricPrompt and retries the operation once authenticated. Resolves
     * the promise with the string returned by [op].
     */
    private fun runWithAuth(
        purpose: String,
        promise: Promise,
        op: (SecretKey) -> String,
    ) {
        val key = try {
            getOrCreateKey(purpose)
        } catch (e: Exception) {
            promise.reject("KEY_FAILED", e.message, e)
            return
        }
        try {
            promise.resolve(op(key))
        } catch (e: UserNotAuthenticatedException) {
            authenticateAndRetry(purpose, promise, key, op)
        } catch (e: Exception) {
            promise.reject("CRYPTO_FAILED", e.message, e)
        }
    }

    private fun authenticateAndRetry(
        purpose: String,
        promise: Promise,
        key: SecretKey,
        op: (SecretKey) -> String,
    ) {
        val activity = currentActivity() as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "no foreground FragmentActivity")
            return
        }
        val executor = androidx.core.content.ContextCompat.getMainExecutor(activity)
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                try {
                    promise.resolve(op(key))
                } catch (e: Exception) {
                    promise.reject("CRYPTO_FAILED", e.message, e)
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                promise.reject("AUTH_ERROR_$errorCode", errString.toString())
            }
        }
        val prompt = BiometricPrompt(activity, executor, callback)
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("MetaMask")
            .setSubtitle("Authenticate to unlock wallet")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL,
            )
            .setConfirmationRequired(false)
            .build()
        prompt.authenticate(info)
    }

    private fun serializeBlob(ct: ByteArray, iv: ByteArray, purpose: String): String {
        return JSONObject()
            .put("v", BLOB_VERSION)
            .put("alg", "AES-GCM-256")
            .put("ct", Base64.getEncoder().encodeToString(ct))
            .put("iv", Base64.getEncoder().encodeToString(iv))
            .put("purpose", purpose)
            .put("hw", "android-keystore")
            .toString()
    }
}
