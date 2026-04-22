/**
 * Shim entry for bare `react-native-safe-area-context` imports (Metro / Jest / tsconfig paths).
 * Re-exports the published module implementation except `SafeAreaView`, which applies the
 * top inset via `useSafeAreaInsets` instead of native top padding to reduce layout jump.
 *
 * Re-exports use `src/` (not `lib/module/`) so codegen runs for native specs during bundling.
 */
export * from 'react-native-safe-area-context/src/SafeAreaContext';
export * from 'react-native-safe-area-context/src/InitialWindow';
export * from 'react-native-safe-area-context/src/SafeArea.types';
export { SafeAreaView } from './SafeAreaViewWithHookTopInset';
