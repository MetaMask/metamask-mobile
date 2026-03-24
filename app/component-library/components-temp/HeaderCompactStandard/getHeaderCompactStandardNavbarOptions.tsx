// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderCompactStandard from './HeaderCompactStandard';
import { HeaderCompactStandardProps } from './HeaderCompactStandard.types';

/**
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
