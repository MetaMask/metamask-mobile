// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderStackedStandard from './HeaderStackedStandard';
import { HeaderStackedStandardProps } from './HeaderStackedStandard.types';

/**
 * Returns React Navigation screen options with a HeaderStackedStandard component.
 *
 * @example
 * ```tsx
 * const options = getHeaderStackedStandardNavbarOptions({
 *   onBack: () => navigation.goBack(),
 *   titleStandardProps: {
 *     title: 'NFT Name',
 *     topLabel: 'Collection',
 *   },
 *   includesTopInset: true,
 * });
 *
 * <Stack.Screen name="NFTDetails" options={options} />
 * ```
 *
 * @param options - Props to pass to the HeaderStackedStandard component.
 * @returns React Navigation screen options object with header property.
 */
const getHeaderStackedStandardNavbarOptions = (
  options: HeaderStackedStandardProps,
): { header: () => React.ReactElement } => ({
  header: () => <HeaderStackedStandard {...options} />,
});

export default getHeaderStackedStandardNavbarOptions;
