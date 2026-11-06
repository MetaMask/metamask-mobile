import React, { useCallback, useState } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import ButtonIconGlass from '../../../../component-library/components-temp/ButtonIconGlass';
import { strings } from '../../../../../locales/i18n';
import type { PredictConfiguredVenue } from '../implementation';
import { PredictVenueSelectorTestIds } from './PredictVenueSelector.testIds';
import { useVenueSelection } from './internal/useVenueSelection';
import { VenueSelectorSheet } from './internal/VenueSelectorSheet';

export interface PredictVenueSelectorButtonProps {
  /**
   * `standard` matches an MMDS header icon; `glass` matches the glass capsule
   * icons of a floating header (`HeaderStandardAnimatedGlass`).
   */
  variant: 'standard' | 'glass';
}

/**
 * Header icon that opens the venue picker and sets the Venue Selection
 * Preference. It renders nothing unless venue selection is enabled and more
 * than one Venue is rolled out (`selectSelectableVenues`), so a header can
 * always place it next to its search icon.
 */
export const PredictVenueSelectorButton = ({
  variant,
}: PredictVenueSelectorButtonProps) => {
  const { selectableVenues, activeVenue, selectVenue } = useVenueSelection();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openSheet = useCallback(() => setIsSheetOpen(true), []);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);
  const handleSelect = useCallback(
    (venue: PredictConfiguredVenue) => selectVenue(venue),
    [selectVenue],
  );

  if (selectableVenues.length < 2) {
    return null;
  }

  const buttonProps: ButtonIconProps = {
    iconName: IconName.Setting,
    size: ButtonIconSize.Md,
    onPress: openSheet,
    testID: PredictVenueSelectorTestIds.BUTTON,
    accessibilityLabel: strings('predict_next.venue_selector.button_label'),
    accessibilityRole: 'button',
  };

  return (
    <>
      {variant === 'glass' ? (
        <ButtonIconGlass isCapsule {...buttonProps} />
      ) : (
        <ButtonIcon {...buttonProps} />
      )}
      {isSheetOpen ? (
        <VenueSelectorSheet
          venues={selectableVenues}
          activeVenue={activeVenue}
          onSelect={handleSelect}
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
};
