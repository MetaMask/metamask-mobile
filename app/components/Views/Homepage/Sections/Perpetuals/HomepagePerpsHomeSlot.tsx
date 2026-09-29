import React, { forwardRef } from 'react';
import { useABTest } from '../../../../../hooks';
import {
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
} from '../../abTestConfig';
import type { SectionRefreshHandle } from '../../types';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import PerpsSection from './PerpsSection';
import { strings } from '../../../../../../locales/i18n';

/**
 * Chooses the empty-state content for the homepage Perps section.
 * The section shell, header, navigation, analytics, and refresh contract all
 * stay owned by `PerpsSection`.
 */
const HomepagePerpsHomeSlot = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>((props, ref) => {
  const { variant: perpsPillsEmptyAbVariant } = useABTest(
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS,
  );

  const emptyStateUsesExplorePills =
    perpsPillsEmptyAbVariant.showExplorePillsWhenEmpty;

  if (!emptyStateUsesExplorePills) {
    return <PerpsSection ref={ref} {...props} />;
  }

  return (
    <PerpsSection
      ref={ref}
      {...props}
      emptyStateContent="pills"
      emptyStateTitleOverride={strings('trending.perps_movers')}
    />
  );
});

HomepagePerpsHomeSlot.displayName = 'HomepagePerpsHomeSlot';

export default HomepagePerpsHomeSlot;
