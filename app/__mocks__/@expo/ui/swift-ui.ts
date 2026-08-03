// Mock for @expo/ui/swift-ui. The real module's components (Text, HStack,
// VStack, ...) call the *throwing* `requireNativeView`/`requireNativeModule`
// (from 'expo') at import time (see node_modules/@expo/ui/src/swift-ui/Text/index.tsx),
// which crashes under Jest's Node environment.
//
// In practice, none of these components are ever actually rendered under
// Jest: every widget layout function (marked with the `'widget'` directive)
// is replaced at build time — including in tests, since babel-preset-expo's
// widgets plugin runs under babel.config.tests.js too — with a *string
// literal* of its own source (see node_modules/babel-preset-expo/build/widgets-plugin.js).
// This mock exists purely so the *import statements* at the top of
// `*.ios.tsx` widget files resolve without crashing; the components
// themselves are never invoked.
import type { ReactNode } from 'react';

function createStubComponent(displayName: string) {
  function StubComponent({ children }: { children?: ReactNode }) {
    return children ?? null;
  }
  StubComponent.displayName = displayName;
  return StubComponent;
}

export const Text = createStubComponent('Text');
export const HStack = createStubComponent('HStack');
export const VStack = createStubComponent('VStack');
export const ZStack = createStubComponent('ZStack');
export const Group = createStubComponent('Group');
export const Spacer = createStubComponent('Spacer');
export const Image = createStubComponent('Image');
export const Host = createStubComponent('Host');
