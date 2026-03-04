// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderStandard from './HeaderStandard';
import { HeaderStandardProps } from './HeaderStandard.types';

/**
 * Returns React Navigation screen options with a HeaderStandard component.
 *
 * @example
 * ```tsx
 * const options = getHeaderStandardNavbarOptions({
 *   title: 'Settings',
 *   onBack: () => navigation.goBack(),
 *   onClose: () => navigation.pop(),
 *   includesTopInset: true,
 * });
 *
 * <Stack.Screen name="Settings" options={options} />
 * ```
 *
 * @param options - Props to pass to the HeaderStandard component.
 * @returns React Navigation screen options object with header property.
 */
const getHeaderStandardNavbarOptions = (
  options: HeaderStandardProps,
): { header: () => React.ReactElement } => ({
  header: () => <HeaderStandard {...options} />,
});

export default getHeaderStandardNavbarOptions;
