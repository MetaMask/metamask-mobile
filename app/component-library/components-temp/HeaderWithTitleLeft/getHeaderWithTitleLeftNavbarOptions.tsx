// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderWithTitleLeft from './HeaderWithTitleLeft';
import { HeaderWithTitleLeftProps } from './HeaderWithTitleLeft.types';

/**
 * Returns React Navigation screen options with a HeaderWithTitleLeft component.
 *
 * @example
 * ```tsx
 * const options = getHeaderWithTitleLeftNavbarOptions({
 *   onBack: () => navigation.goBack(),
 *   titleLeftProps: {
 *     title: 'NFT Name',
 *     topLabel: 'Collection',
 *   },
 *   includesTopInset: true,
 * });
 *
 * <Stack.Screen name="NFTDetails" options={options} />
 * ```
 *
 * @param options - Props to pass to the HeaderWithTitleLeft component.
 * @returns React Navigation screen options object with header property.
 */
const getHeaderWithTitleLeftNavbarOptions = (
  options: HeaderWithTitleLeftProps,
): { header: () => React.ReactElement } => ({
  header: () => <HeaderWithTitleLeft {...options} />,
});

export default getHeaderWithTitleLeftNavbarOptions;
