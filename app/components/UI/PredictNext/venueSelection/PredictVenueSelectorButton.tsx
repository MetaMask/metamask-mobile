import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import ButtonIconGlass from '../../../../component-library/components-temp/ButtonIconGlass';
import { CAPSULE_ITEM_HIT_SLOP } from '../../../../component-library/components-temp/CapsuleGlass';
import { strings } from '../../../../../locales/i18n';
import {
  selectSelectableVenues,
  type PredictConfiguredVenue,
} from '../implementation';
import { PredictVenueSelectorTestIds } from './PredictVenueSelector.testIds';
import { useVenueSelection } from './internal/useVenueSelection';
import { VenueSelectorSheet } from './internal/VenueSelectorSheet';

export interface PredictVenueSelectorButtonProps {
  /**
   * `standard` matches an MMDS header icon; `glass` matches the glass capsule
   * icons of a floating header (`HeaderStandardAnimatedGlass`);
   * `glass-group` is the brand refresh sliders icon, seated in a capsule the
   * caller shares with its other header icons.
   */
  variant: 'standard' | 'glass' | 'glass-group';
}

const hasVenueChoice = (venues: readonly PredictConfiguredVenue[]): boolean =>
  venues.length >= 2;

/**
 * Whether `PredictVenueSelectorButton` renders: venue selection is enabled
 * and more than one Venue is rolled out. A header that groups its icons reads
 * it to know what its group holds.
 */
export const useIsVenueSelectorShown = (): boolean =>
  hasVenueChoice(useSelector(selectSelectableVenues));

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

  if (!hasVenueChoice(selectableVenues)) {
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

  const renderButton = (): React.JSX.Element => {
    switch (variant) {
      case 'glass':
        return <ButtonIconGlass isCapsule {...buttonProps} />;
      case 'glass-group':
        return (
          <ButtonIcon
            {...buttonProps}
            iconName={IconName.Customize}
            hitSlop={CAPSULE_ITEM_HIT_SLOP}
          />
        );
      default:
        return <ButtonIcon {...buttonProps} />;
    }
  };

  return (
    <>
      {renderButton()}
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
