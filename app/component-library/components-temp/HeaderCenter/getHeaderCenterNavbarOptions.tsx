// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderCenter from './HeaderCenter';
import { HeaderCenterProps } from './HeaderCenter.types';

/**
 * Returns React Navigation screen options with a HeaderCenter component.
 *
 * @example
 * ```tsx
 * const options = getHeaderCenterNavbarOptions({
 *   title: 'Settings',
 *   onBack: () => navigation.goBack(),
 *   onClose: () => navigation.pop(),
 *   includesTopInset: true,
 * });
 *
 * <Stack.Screen name="Settings" options={options} />
 * ```
 *
 * @param options - Props to pass to the HeaderCenter component.
 * @returns React Navigation screen options object with header property.
 */
const getHeaderCenterNavbarOptions = (
  options: HeaderCenterProps,
): { header: () => React.ReactElement } => ({
  header: () => <HeaderCenter {...options} />,
});

export default getHeaderCenterNavbarOptions;
