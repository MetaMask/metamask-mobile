# Kalshi device key

Phase 1 of the Kalshi ISV flow, after the existing SRP login. The mobile app holds a P-256 device key and a 16-byte salt. The A2T `nonce` is `base64url(SHA-256(public key || salt))`. `a2tSession.ensureA2T` sends the public key and salt to the A2T issuer, signs `srpMessage` with the SRP key, and signs the proof of possession with this key.

`auth/p256DeviceKey.ts` implements the allowlisted `device-p256-salt-v1` key
strategy. It does not choose Kalshi behavior itself. The Engine-owned
`PredictDeviceAuthService` binds it once to the bundled authentication profile,
which supplies the stable key slot. The implementation fixes the uncompressed
public key, the raw `r || s` signature, the 16-byte salt, and the SHA-256
commitment. It derives keychain storage from the slot; profiles cannot provide
raw keychain identifiers. The service separately applies the Predict and Kalshi
feature gates and owns the in-memory A2T session.

The authentication profile ID and device-key slot are intentionally separate.
An A2T protocol revision can select a new profile while retaining
`kalshi-v1`; changing the key slot is the explicit key-rotation boundary.
Remote configuration may select a bundled profile ID, but cannot provide or
override cryptographic instructions.

Locking the wallet or turning Kalshi off drops the plaintext key and A2T;
leaving the Predict stack does not discard the Engine session. The encrypted
copy remains until wallet reset calls `PredictDeviceAuthService:reset`.

The private key never leaves the module. Callers receive the 65-byte
uncompressed public point (`0x04 || X || Y`), the 16-byte salt, and the
unpadded base64url forms of both. The profile-bound implementation returns a
64-byte `r || s` signature over SHA-256, which is the encoding Kalshi verifies.

## What this build does

The key is a software key from `@noble/curves` (`p256`, secp256r1 /
prime256v1). `SecureKeychain.setSecureItem` encrypts the private key and salt
together and writes them under the slot-derived keychain service, currently
`com.metamask.predict.device-key.kalshi-v1`, with
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`. That is the same helper and accessibility
used for other app secrets such as Card and Ramp tokens. The current record is
`{ v: 2, keySlot, secretKey, salt }`. An older version, a different key slot,
or a corrupt payload is discarded and replaced. An integer version newer than
2 stays in the keychain, and the read returns no key. The public key is
derived on load, so a stored public key cannot drift from the private key.

`SecureKeychain` encrypts with the app fox code before the value reaches the OS
keychain. Reading it back does not require the wallet password. The module
still refuses to load the plaintext until `KeyringController` is unlocked, and
it zeros that plaintext on lock. Wallet reset calls the profile-bound delete
operation, which removes the keychain item as well.

An app kill keeps the encrypted key. The next unlock loads the same key and salt, so the A2T nonce stays stable. A corrupt record is discarded and replaced.

This is the same algorithm and the same wire format as the localhost POC. Once loaded, it is an exportable key in the JS heap. A debugger or a memory dump can read it while the wallet is unlocked.

Do not copy the private key into AsyncStorage, MMKV, Redux, logs, or the KeyringController vault. PredictNext still forbids credentials in Redux and general persisted product state.

The service does not expose generic signing. A later request-signing capability
signs a payload whose shape mobile does not define. predict-api will likely
build that payload, and mobile will check it against a template before
signing. Mobile can also build the payload from a template the backend
supplies. In both cases the template comes from outside this client.

## What a production key requires

A non-exportable key has to be created by a new native module. `react-native-keychain` stores passwords. `expo-secure-store` stores strings. `react-native-quick-crypto` and `@noble/curves` generate software keys. None of them create a Secure Enclave or Android Keystore key, and none of them return the 64-byte `r || s` signature Kalshi requires. Adding the native module means a native rebuild (`yarn setup`, then an iOS and Android build). It cannot be done from JavaScript alone.

Replace the `device-p256-salt-v1` implementation behind `createP256DeviceKey` with
that module. Keep the profile and public-material contracts stable. The Engine
service should still refuse to run when the selected Venue is off, and the JS
layer should still be unable to read the private key.

Production builds must fail closed when the native module is missing. Do not fall back to the software key in a release build.

The salt is not the private key. It is sent on requests, and it has to stay paired with this device key. Generate 16 bytes from the platform CSPRNG and store them in the keychain (iOS) or encrypted preferences (Android) under the same lifetime as the key. Delete the salt when the key is deleted. A reinstall creates a new key and a new salt. That matches the spec's rule for a new installation.

Signing has to be silent. Do not require biometrics or a device-credential prompt on each signature. Enrollment, renewal, and every later device-signed request would otherwise prompt the user.

### iOS Secure Enclave

Swift module, called from React Native.

1. `SecKeyCreateRandomKey` with:
   - `kSecAttrKeyType`: `kSecAttrKeyTypeECSECPrimeRandom`
   - `kSecAttrKeySizeInBits`: 256
   - `kSecAttrTokenID`: `kSecAttrTokenIDSecureEnclave`
   - `kSecPrivateKeyAttrs`: `kSecAttrIsPermanent` true, `kSecAttrApplicationTag` `io.metamask.predict.kalshi.device.p256`, access control `kSecAccessControlPrivateKeyUsage` with no user-presence flag
2. `SecKeyCopyExternalRepresentation` on the private key must fail. If it succeeds, the key is exportable and the module should refuse to use it.
3. Public key: `SecKeyCopyPublicKey`, then `SecKeyCopyExternalRepresentation`. That is the ANSI X9.63 uncompressed point, 65 bytes, `0x04 || X || Y`. Pass those bytes through unchanged.
4. Sign with `SecKeyCreateSignature` and `kSecKeyAlgorithmECDSASignatureMessageX962SHA256`. Pass the message bytes. The algorithm hashes with SHA-256. The result is DER, not raw `r || s`.
5. Convert DER to 64 bytes. Parse the SEQUENCE of two INTEGERs, strip a leading `0x00` on each integer, left-pad to 32 bytes, concatenate `r || s`.
6. Salt: `SecRandomCopyBytes` of 16 bytes, stored as its own keychain item, not inside the enclave key.
7. On a device or simulator where the Secure Enclave is unavailable, fail closed in production.

### Android Keystore

Kotlin module.

1. `KeyPairGenerator.getInstance("EC", "AndroidKeyStore")`.
2. `KeyGenParameterSpec.Builder("io.metamask.predict.kalshi.device.p256", PURPOSE_SIGN)`:
   - `setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))`
   - `setDigests(KeyProperties.DIGEST_SHA256)`
   - `setUserAuthenticationRequired(false)`
   - try `setIsStrongBoxBacked(true)`, and on `StrongBoxUnavailableException` generate again without StrongBox
3. The private key stays in the keystore. Do not call `getEncoded()` on it. A non-null encoding means the key is exportable. Refuse it.
4. `publicKey.encoded` is an X.509 SubjectPublicKeyInfo, not the raw point. Take the BIT STRING payload and require 65 bytes starting with `0x04`.
5. Sign with `Signature.getInstance("SHA256withECDSA")`. The output is DER. Apply the same DER-to-`r || s` conversion as iOS.
6. Salt: 16 bytes from `SecureRandom`, stored in encrypted preferences under the same alias lifetime.

### Check the native module against this contract

- Public key is 65 bytes, first byte `0x04`, and `p256.utils.isValidPublicKey(bytes, false)` accepts it.
- A signature over a known message is 64 bytes and verifies with Node `crypto.verify('sha256', message, { key, dsaEncoding: 'ieee-p1363' }, signature)`.
- Exporting the private key throws.
- A second call returns the same public key and salt until the app is reinstalled or the key is explicitly deleted.
- The profile-bound commitment operation matches
  `base64url(SHA-256(publicRaw || salt))` with no padding.
