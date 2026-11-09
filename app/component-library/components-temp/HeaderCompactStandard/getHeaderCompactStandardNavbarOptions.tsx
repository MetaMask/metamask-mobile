// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderCompactStandard from './HeaderCompactStandard';
import { HeaderCompactStandardProps } from './HeaderCompactStandard.types';

/**
 * @deprecated Please update your code to use `HeaderStandard` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * MMDS has no navbar-options helper. Set the React Navigation `header` option to render `HeaderStandard` instead: `header: () => <HeaderStandard {...options} />`.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/HeaderStandard/README.md}
 * @since @metamask/design-system-react-native@0.14.0
 *
 * Returns React Navigation screen options with a HeaderCompactStandard component.
 *
 * @example
 * ```tsx
 * const options = getHeaderCompactStandardNavbarOptions({
 *   title: 'Settings',
 *   onBack: () => navigation.goBack(),
 *   onClose: () => navigation.pop(),
 *   includesTopInset: true,
 * });
 *
 * <Stack.Screen name="Settings" options={options} />
 * ```
 *
 * @param options - Props to pass to the HeaderCompactStandard component.
 * @returns React Navigation screen options object with header property.
 */
const getHeaderCompactStandardNavbarOptions = (
  options: HeaderCompactStandardProps,
): { header: () => React.ReactElement } => ({
  header: () => <HeaderCompactStandard {...options} />,
});

export default getHeaderCompactStandardNavbarOptions;
