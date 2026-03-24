/**
 * Camera permission is fully handled by AnimatedQRScannerModal via
 * react-native-vision-camera's useCameraPermission / requestPermission().
 *
 * This hook no longer pre-checks or pre-requests Android camera permission
 * because PermissionsAndroid and react-native-vision-camera maintain separate
 * permission state, and calling PermissionsAndroid.request() can conflict with
 * vision-camera's camera initialization pipeline (see #26115).
 *
 * hasCameraPermission is always true so the "Get signature" button is never
 * disabled for permission reasons. The scanner modal will prompt the user
 * when it opens.
 */
export const useCamera = (_isSigningQRObject: boolean) => ({
  cameraError: undefined as string | undefined,
  hasCameraPermission: true,
});
