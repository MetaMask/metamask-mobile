// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderWithTitleLeftScrollable from './HeaderWithTitleLeftScrollable';
import { HeaderWithTitleLeftScrollableProps } from './HeaderWithTitleLeftScrollable.types';

/**
 * Returns React Navigation screen options with a HeaderWithTitleLeftScrollable component.
 *
 * @example
 * ```tsx
 * const { scrollY, onScroll, expandedHeight, setExpandedHeight } = useHeaderWithTitleLeftScrollable();
 *
 * const options = getHeaderWithTitleLeftScrollableNavbarOptions({
 *   title: 'Send',
 *   scrollY,
 *   onBack: () => navigation.goBack(),
 *   onExpandedHeightChange: setExpandedHeight,
 *   titleLeftProps: {
 *     title: '$4.42',
 *     topLabel: 'Send',
 *   },
 * });
 *
 * <Stack.Screen name="Send" options={options} />
 * ```
 *
 * @param options - Props to pass to the HeaderWithTitleLeftScrollable component.
 * @returns React Navigation screen options object with header property.
 */
const getHeaderWithTitleLeftScrollableNavbarOptions = (
  options: HeaderWithTitleLeftScrollableProps,
): { header: () => React.ReactElement } => ({
  header: () => <HeaderWithTitleLeftScrollable {...options} />,
});

export default getHeaderWithTitleLeftScrollableNavbarOptions;
