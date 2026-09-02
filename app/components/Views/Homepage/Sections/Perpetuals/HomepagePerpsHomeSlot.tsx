import React, { forwardRef, useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
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
import useSectionViewportVisible from '../../hooks/useSectionViewportVisible';

interface HomepagePerpsHomeSlotProps extends PerpsSectionProps {
  onVisible?: () => void;
}

/**
 * Chooses the empty-state content for the homepage Perps section.
 * The section shell, header, navigation, analytics, and refresh contract all
 * stay owned by `PerpsSection`.
 */
const HomepagePerpsHomeSlot = forwardRef<
  SectionRefreshHandle,
  HomepagePerpsHomeSlotProps
>(({ onVisible, ...props }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const { variant: perpsPillsEmptyAbVariant } = useABTest(
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS,
  );

  const emptyStateUsesExplorePills =
    perpsPillsEmptyAbVariant.showExplorePillsWhenEmpty;

  const { isVisible, onLayout } = useSectionViewportVisible(sectionViewRef, {
    once: true,
  });

  useLayoutEffect(() => {
    if (isVisible) {
      onVisible?.();
    }
  }, [isVisible, onVisible]);

  return (
    <View ref={sectionViewRef} onLayout={onLayout}>
      {emptyStateUsesExplorePills ? (
        <PerpsSection
          ref={ref}
          {...props}
          emptyStateContent="pills"
          emptyStateTitleOverride={strings('trending.perps_movers')}
        />
      ) : (
        <PerpsSection ref={ref} {...props} />
      )}
    </View>
  );
});

HomepagePerpsHomeSlot.displayName = 'HomepagePerpsHomeSlot';

export default HomepagePerpsHomeSlot;
