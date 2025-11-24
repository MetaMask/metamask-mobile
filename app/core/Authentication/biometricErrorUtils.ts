/**
 * Biometric Error Utilities
 *
 * Detects user cancellation and other biometric errors across platforms.
 * react-native-keychain doesn't provide error types, so we detect them from error codes/messages.
 *
 * OFFICIAL DOCUMENTATION SOURCES:
 * - iOS LocalAuthentication: https://developer.apple.com/documentation/localauthentication/laerror
 * - Android BiometricPrompt: https://developer.android.com/reference/androidx/biometric/BiometricPrompt
 * - react-native-keychain: https://github.com/oblador/react-native-keychain
 *
 * WORLDWIDE DEVICE COVERAGE:
 *
 * ✅ iOS Devices (All worldwide markets):
 * - iPhone 5s and later (Touch ID)
 * - iPhone X and later (Face ID)
 * - Apple Vision Pro (Optic ID)
 * Error codes are CONSISTENT across all iOS devices and regions
 *
 * ✅ Android Devices - STANDARDIZED BiometricPrompt API (Android 9.0+):
 *
 * ASIA-PACIFIC:
 * - Xiaomi/Redmi/POCO (MIUI) - Fingerprint, Face Unlock, In-display sensors
 * - Oppo (ColorOS) - Fingerprint, Face Recognition
 * - Vivo/iQOO (Funtouch OS) - In-display fingerprint, Face Unlock
 * - Realme (Realme UI) - Fingerprint, Face Recognition
 * - OnePlus (OxygenOS) - In-display fingerprint, Face Unlock
 * - Samsung (One UI) - Fingerprint, Face, Iris (older models)
 * - Huawei (EMUI/HarmonyOS with Google Services) - Fingerprint, Face, 3D Face
 * - Tecno, Infinix, itel - Fingerprint, Face Recognition
 *
 * GLOBAL MANUFACTURERS:
 * - Google Pixel - Fingerprint, Face Unlock
 * - Motorola - Fingerprint
 * - Sony - Fingerprint
 * - Nokia - Fingerprint
 * - LG - Fingerprint (legacy devices)
 *
 * IMPORTANT NOTES:
 * 1. BiometricPrompt API (Android 9.0+) provides STANDARDIZED error codes
 * 2. Manufacturer-specific biometric implementations are ABSTRACTED by the API
 * 3. Custom ROMs (LineageOS, etc.) that include BiometricPrompt also use standard codes
 * 4. In-display, side-mounted, rear-mounted sensors ALL return the same error codes
 *
 * ⚠️ LEGACY DEVICES (Pre-Android 9.0):
 * - Older devices using FingerprintManager API (Android 6.0-8.1)
 * - May have slightly different error messages, but error codes remain similar
 * - react-native-keychain handles the API differences internally
 *
 * TESTING RECOMMENDATIONS:
 * - Test on various iOS devices (different Face ID/Touch ID)
 * - Test on various Android manufacturers (Samsung, Google, Xiaomi, etc.)
 * - Test in different regions (error messages may vary by device locale)
 * - Test on both flagship and budget devices from each manufacturer
 * - Monitor production error logs for unhandled patterns
 *
 * PRODUCTION MONITORING:
 * If you encounter a device where cancellation is not detected correctly:
 * 1. Log the full error object (message, code, name, stack)
 * 2. Log the device information (manufacturer, model, OS version)
 * 3. Add the pattern to this utility with documentation
 * 4. Create a test case for that specific pattern
 *
 * KNOWN EDGE CASES:
 * - Some custom ROMs may have modified error messages (error codes remain standard)
 * - Devices with multiple biometric sensors (e.g., both fingerprint and face)
 * return the same cancellation codes regardless of which sensor was used
 * - Huawei devices with HMS (Huawei Mobile Services) instead of GMS may have
 * different error messages, but error codes should remain consistent
 */

/**
 * Detects if a biometric/keychain error was caused by user cancellation.
 *
 * Handles all platforms and biometric types:
 * - iOS Touch ID/Face ID/Optic ID cancellation
 * - Android BiometricPrompt cancellation (Fingerprint, Face, Iris)
 * - Device passcode cancellation
 *
 * ERROR CODES DETECTED:
 *
 * iOS LocalAuthentication (LAError):
 * - LAErrorUserCancel (-2): User tapped the cancel button
 * - LAErrorUserFallback (-3): User chose to enter password instead
 * - LAErrorSystemCancel (-4): System cancelled authentication (e.g., app went to background)
 * Source: https://developer.apple.com/documentation/localauthentication/laerror/code
 *
 * Android BiometricPrompt:
 * - ERROR_NEGATIVE_BUTTON (13): User pressed negative button/cancel
 * - ERROR_USER_CANCELED (10): User dismissed with back button or gesture
 * Source: https://developer.android.com/reference/androidx/biometric/BiometricPrompt#constants_1
 *
 * @param error - The error thrown by SecureKeychain/react-native-keychain
 * @returns true if user cancelled, false otherwise
 *
 * @example
 * ```typescript
 * try {
 *   await SecureKeychain.getGenericPassword();
 * } catch (error) {
 *   if (isUserCancellation(error)) {
 *     // User cancelled - don't lock app
 *   } else {
 *     // Real error - handle accordingly
 *   }
 * }
 * ```
 */
export function isUserCancellation(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const errorMessage = (error as Error)?.message?.toLowerCase() || '';
  const errorCode = (error as { code?: string | number })?.code;

  // ============================================
  // iOS CANCELLATION DETECTION
  // Source: https://developer.apple.com/documentation/localauthentication/laerror
  // ============================================

  // iOS LocalAuthentication error messages
  // These are the actual error messages returned by iOS LocalAuthentication framework
  // when users cancel biometric authentication
  if (
    errorMessage.includes('user canceled') ||
    errorMessage.includes('user cancelled') ||
    errorMessage.includes('authentication was canceled') ||
    errorMessage.includes('authentication was cancelled')
  ) {
    return true;
  }

  // iOS LAError codes
  // Source: https://developer.apple.com/documentation/localauthentication/laerror/code
  //
  // LAErrorUserCancel = -2
  //   Description: User tapped the cancel button in the authentication dialog
  //   Applies to: Touch ID, Face ID, Optic ID
  //
  // LAErrorUserFallback = -3
  //   Description: User chose to enter their device password instead of using biometrics
  //   Applies to: Touch ID, Face ID, Optic ID
  //
  // LAErrorSystemCancel = -4
  //   Description: System cancelled authentication (e.g., app went to background, incoming call)
  //   Applies to: Touch ID, Face ID, Optic ID
  if (
    errorCode === -2 ||
    errorCode === '-2' ||
    errorCode === -3 ||
    errorCode === '-3' ||
    errorCode === -4 ||
    errorCode === '-4'
  ) {
    return true;
  }

  // ============================================
  // ANDROID CANCELLATION DETECTION
  // Source: https://developer.android.com/reference/androidx/biometric/BiometricPrompt
  // ============================================

  // Android BiometricPrompt error codes
  // Source: https://developer.android.com/reference/androidx/biometric/BiometricPrompt#constants_1
  //
  // ERROR_NEGATIVE_BUTTON = 13
  //   Description: User pressed the negative button (e.g., "Cancel", "Use Password")
  //   Applies to: All biometric types (Fingerprint, Face, Iris)
  //   Devices: All Android devices with BiometricPrompt API (Android 9.0+)
  //
  // ERROR_USER_CANCELED = 10
  //   Description: User dismissed the prompt (back button, outside tap, swipe gesture)
  //   Applies to: All biometric types (Fingerprint, Face, Iris)
  //   Devices: All Android devices with BiometricPrompt API (Android 9.0+)
  if (
    errorCode === 13 ||
    errorCode === '13' ||
    errorCode === 10 ||
    errorCode === '10'
  ) {
    return true;
  }

  // String-based code detection
  // Some implementations embed the error code in the error message
  // Format: "Biometric authentication failed: code: 13"
  if (errorMessage.includes('code: 13') || errorMessage.includes('code: 10')) {
    return true;
  }

  // Android error constant names
  // Some implementations return the constant name as a string
  if (
    errorMessage.includes('error_negative_button') ||
    errorMessage.includes('error_user_canceled')
  ) {
    return true;
  }

  // Additional cancellation patterns found in the wild
  // These cover edge cases from various device implementations
  if (
    errorMessage.includes('authentication canceled') ||
    errorMessage.includes('authentication cancelled') ||
    errorMessage.includes('user cancelled') ||
    errorMessage.includes('user canceled') ||
    errorMessage.includes('biometric canceled') ||
    errorMessage.includes('biometric cancelled') ||
    (errorMessage.includes('cancel') &&
      (errorMessage.includes('user') || errorMessage.includes('auth')))
  ) {
    return true;
  }

  return false;
}

/**
 * Detects if a biometric error was caused by lockout (too many failed attempts).
 *
 * ERROR CODES DETECTED:
 *
 * iOS LocalAuthentication (LAError):
 * - LAErrorBiometryLockout (-8): Too many failed attempts, biometrics locked
 * Source: https://developer.apple.com/documentation/localauthentication/laerror/laerrorbiometrylockout
 *
 * Android BiometricPrompt:
 * - ERROR_LOCKOUT (7): Biometric authentication temporarily locked (30 seconds)
 * - ERROR_LOCKOUT_PERMANENT (9): Biometric authentication permanently locked (requires device unlock)
 * Source: https://developer.android.com/reference/androidx/biometric/BiometricPrompt#ERROR_LOCKOUT()
 *
 * @param error - The error thrown by SecureKeychain/react-native-keychain
 * @returns true if lockout detected, false otherwise
 */
export function isBiometricLockout(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const errorMessage = (error as Error)?.message?.toLowerCase() || '';
  const errorCode = (error as { code?: string | number })?.code;

  // iOS LAErrorBiometryLockout = -8
  // Biometric authentication is locked due to too many failed attempts
  // User must enter device passcode to unlock
  // Source: https://developer.apple.com/documentation/localauthentication/laerror/laerrorbiometrylockout
  if (errorCode === -8 || errorCode === '-8') {
    return true;
  }

  // Android BiometricPrompt lockout codes
  // Source: https://developer.android.com/reference/androidx/biometric/BiometricPrompt#constants_1
  //
  // ERROR_LOCKOUT = 7
  //   Description: Temporary lockout (30 seconds) after 5 failed attempts
  //   Resolution: Wait 30 seconds or use device credential
  //
  // ERROR_LOCKOUT_PERMANENT = 9
  //   Description: Permanent lockout after multiple temporary lockouts
  //   Resolution: Must unlock device with PIN/pattern/password
  if (
    errorCode === 7 ||
    errorCode === '7' ||
    errorCode === 9 ||
    errorCode === '9'
  ) {
    return true;
  }

  // String-based lockout detection
  // Catches error messages like "Biometric sensor locked out"
  if (errorMessage.includes('lockout') || errorMessage.includes('locked out')) {
    return true;
  }

  return false;
}
