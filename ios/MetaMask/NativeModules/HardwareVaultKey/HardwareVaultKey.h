#import <React/RCTBridgeModule.h>

/**
 * HardwareVaultKey — per-install, hardware-backed, user-authenticated storage
 * for wallet credentials (iOS).
 *
 * The Secure Enclave does not expose a symmetric AES key via SecKey, so the
 * idiomatic iOS primitive is a SEP-protected Keychain item: the item's key is
 * wrapped by the Secure Enclave and is non-extractable, and reading it requires
 * biometric/device-passcode authentication (decrypt-in-hardware). This is the
 * iOS equivalent of the Android Keystore AES-GCM path.
 *
 * The JS layer stores a reference blob (hw = "ios-sep-keychain") as the
 * react-native-keychain item value; the actual secret lives in a separate
 * Keychain item keyed by service `mm.wallet.hw.<purpose>`, bound to its
 * purpose so one scope cannot read another's secret.
 *
 * Degraded fallback: if no biometric/device-passcode auth is available,
 * isAvailable returns NO and the JS layer falls back to the legacy foxCode
 * path (documented risk).
 */
@interface HardwareVaultKey : NSObject <RCTBridgeModule>
@end
