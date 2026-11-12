import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import type {
  MarginMode,
  MarginModeLockReason,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import CrossMarginIcon from '../../../../../images/perps/margin-mode/cross.svg';
import { PerpsMarginModeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsSelectionOptionCard from '../PerpsSelectionBottomSheet/PerpsSelectionOptionCard';
import PerpsCrossMarginRatioBanner from '../PerpsCrossMarginRatioBanner';
import {
  getCrossMarginRatioAlert,
  getCrossMarginRatioAlertLabel,
  getCrossMarginRatioTone,
} from '../../utils/crossMarginSummary';
import { formatCrossMarginRatio } from '../../utils/formatUtils';

interface PerpsMarginModeBottomSheetProps {
  isVisible?: boolean;
  /** Market pair shown in the title, e.g. `BTC-USDC`. */
  marketLabel?: string;
  onClose: () => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  selectedMarginMode?: MarginMode;
  /** Cross is selectable only when the flag, provider, and market allow it. */
  isCrossMarginAvailable?: boolean;
  /** An open position, resting order or TWAP fixes the market's margin mode. */
  isMarginModeLocked?: boolean;
  /** Why the venue fixes the margin mode, when known. */
  lockReason?: MarginModeLockReason;
  /** Called when the trader presses the option the lock rules out. */
  onLockedOptionPress?: () => void;
  /** Current cross margin ratio (0..1), shown when it needs attention. */
  crossMarginRatio?: number;
  onMarginModeSelect?: (marginMode: MarginMode) => void;
}

const PerpsMarginModeBottomSheet: React.FC<PerpsMarginModeBottomSheetProps> = ({
  isVisible = true,
  marketLabel,
  onClose,
  sheetRef: externalSheetRef,
  selectedMarginMode = 'isolated',
  isCrossMarginAvailable = false,
  isMarginModeLocked = false,
  lockReason,
  onLockedOptionPress,
  crossMarginRatio,
  onMarginModeSelect,
}) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const handleIsolatedPress = useCallback(() => {
    onMarginModeSelect?.('isolated');
    handleClose();
  }, [handleClose, onMarginModeSelect]);

  const handleCrossPress = useCallback(() => {
    onMarginModeSelect?.('cross');
    handleClose();
  }, [handleClose, onMarginModeSelect]);

  const isIsolatedSelected = selectedMarginMode === 'isolated';
  const isIsolatedDisabled = isMarginModeLocked && !isIsolatedSelected;
  const isCrossLockedOut = isMarginModeLocked && isIsolatedSelected;
  const isCrossDisabled = !isCrossMarginAvailable || isCrossLockedOut;
  const lockedOptionPress = lockReason ? onLockedOptionPress : undefined;

  const ratioTone = isCrossMarginAvailable
    ? getCrossMarginRatioTone(crossMarginRatio)
    : undefined;
  const ratioSeverity = getCrossMarginRatioAlert(ratioTone);
  const formattedRatio =
    ratioSeverity && crossMarginRatio !== undefined
      ? formatCrossMarginRatio(crossMarginRatio)
      : undefined;
  // The ratio is private, so both the option tag and the banner name the
  // risk level instead of printing the figure while privacy mode is on.
  const ratioTag =
    ratioSeverity === undefined || crossMarginRatio === undefined
      ? undefined
      : getCrossMarginRatioAlertLabel(
          crossMarginRatio,
          ratioSeverity,
          privacyMode,
        );

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsMarginModeBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {marketLabel
          ? strings('perps.margin_mode.title_with_market', {
              market: marketLabel,
            })
          : strings('perps.margin_mode.title')}
      </BottomSheetHeader>
      <Box gap={2} twClassName="px-4 pb-4">
        <Box accessibilityRole="radiogroup" gap={2}>
          <PerpsSelectionOptionCard
            option={{
              id: 'isolated',
              title: strings('perps.margin_mode.isolated_title'),
              description: strings('perps.margin_mode.isolated_description'),
              icon: (
                <Icon
                  name={IconName.Refresh}
                  size={IconSize.Lg}
                  color={IconColor.IconDefault}
                />
              ),
              isDisabled: isIsolatedDisabled,
              onDisabledPress: isIsolatedDisabled
                ? lockedOptionPress
                : undefined,
            }}
            isSelected={isIsolatedSelected}
            onPress={handleIsolatedPress}
            testID={PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION}
          />
          <PerpsSelectionOptionCard
            option={{
              id: 'cross',
              title: strings('perps.margin_mode.cross_title'),
              tag: ratioTag,
              tagSeverity: ratioSeverity ?? TagSeverity.Neutral,
              description: strings(
                isCrossMarginAvailable
                  ? 'perps.margin_mode.cross_description_available'
                  : 'perps.margin_mode.cross_description',
              ),
              icon: (
                <CrossMarginIcon
                  name="cross-margin"
                  width={24}
                  height={24}
                  color={tw.color('icon-default')}
                />
              ),
              isDisabled: isCrossDisabled,
              onDisabledPress:
                isCrossMarginAvailable && isCrossLockedOut
                  ? lockedOptionPress
                  : undefined,
            }}
            isSelected={!isIsolatedSelected}
            onPress={handleCrossPress}
            testID={PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION}
          />
        </Box>
        {lockReason ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="rounded-xl bg-muted px-3 py-2"
            testID={PerpsMarginModeBottomSheetSelectorsIDs.LOCK_NOTICE}
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="flex-1"
            >
              {strings(
                lockReason === 'open_order'
                  ? 'perps.margin_mode.locked_by_open_order'
                  : 'perps.margin_mode.locked_by_position',
              )}
            </Text>
          </Box>
        ) : null}
        {ratioSeverity && formattedRatio ? (
          <PerpsCrossMarginRatioBanner
            ratio={formattedRatio}
            severity={ratioSeverity}
            isRatioHidden={privacyMode}
            testID={PerpsMarginModeBottomSheetSelectorsIDs.RATIO_BANNER}
          />
        ) : null}
      </Box>
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
