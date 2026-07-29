import React, { forwardRef } from 'react';
import type { SectionRefreshHandle } from '../../types';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import PerpsSection from './PerpsSection';

/**
 * Chooses the empty-state content for the homepage Perps section.
 * The section shell, header, navigation, analytics, and refresh contract all
 * stay owned by `PerpsSection`.
 */
const HomepagePerpsHomeSlot = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>((props, ref) => (
  <PerpsSection ref={ref} {...props} emptyStateContent="pills" />
));

HomepagePerpsHomeSlot.displayName = 'HomepagePerpsHomeSlot';

export default HomepagePerpsHomeSlot;
