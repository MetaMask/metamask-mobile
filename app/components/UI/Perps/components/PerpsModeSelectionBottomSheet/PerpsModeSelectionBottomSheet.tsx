import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PerpsMode } from '@metamask/perps-controller';
import React, { useEffect, useMemo, useRef } from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import foxLogo from '../../../../../images/branding/fox.png';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { getPerpsProChooserIconColors } from '../../constants/perpsModeColors';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';

export interface PerpsModeSelectionBottomSheetProps {
  isVisible?: boolean;
  /** Defaults to Lite so first-time presentation matches product default. */
  selectedMode?: PerpsMode;
  onSelect: (mode: PerpsMode) => void;
  onClose: () => void;
}

interface ModeCardProps {
  mode: PerpsMode;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

const ModeCard = ({
  mode,
  title,
  description,
  isSelected,
  onPress,
}: ModeCardProps) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const { candlestick: proCandlestickColor, tile: proIconTileColor } =
    getPerpsProChooserIconColors(themeAppearance === AppThemeKey.dark);
  const proIconTileStyle = useMemo(
    () => ({ backgroundColor: proIconTileColor }),
    [proIconTileColor],
  );
  const proIconStyle = useMemo(
    () => ({ color: proCandlestickColor }),
    [proCandlestickColor],
  );
  const isLite = mode === PerpsMode.Lite;
  const optionTestID = isLite
    ? PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION
    : PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION;

  return (
    <ButtonBase
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ selected: isSelected }}
      testID={optionTestID}
      // `h-auto` + `self-stretch` let the taller card set the row height and
      // the shorter card grow with it. `min-w-0` lets flex children shrink so
      // descriptions wrap instead of overflowing the 2-column row. `justify-start`
      // keeps copy top-aligned when a card is stretched to match its neighbor.
      twClassName={(pressed) =>
        `h-auto min-w-0 flex-1 self-stretch items-stretch justify-start rounded-xl border p-4 ${
          isSelected ? 'border-default' : 'border-transparent'
        } ${pressed ? 'bg-pressed' : 'bg-section'}`
      }
      contentWrapperProps={{
        twClassName: 'min-w-0 w-full flex-1 items-stretch justify-start',
      }}
    >
      <Box twClassName="min-w-0 w-full">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName={`size-14 rounded-full ${
              isLite ? 'bg-error-muted' : ''
            }`}
            style={isLite ? undefined : proIconTileStyle}
            testID={
              isLite
                ? undefined
                : PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON_TILE
            }
          >
            {isLite ? (
              <Image
                source={foxLogo}
                resizeMode="contain"
                style={tw.style('size-8')}
                testID={PerpsModeSelectionBottomSheetSelectorsIDs.LITE_ICON}
              />
            ) : (
              <Icon
                name={IconName.CandlestickFilled}
                size={IconSize.Xl}
                // Gold is outside IconColor, so override `currentColor` (and
                // the Svg `fill`) instead of using WarningDefault.
                fill={proCandlestickColor}
                style={proIconStyle}
                testID={PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON}
              />
            )}
          </Box>
          {isSelected ? (
            // The design system has no filled confirmation glyph, so the solid
            // check badge is composed from a filled circle and an inverse check.
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="size-5 rounded-full bg-icon-default"
              testID={
                PerpsModeSelectionBottomSheetSelectorsIDs.SELECTED_INDICATOR
              }
            >
              <Icon
                name={IconName.CheckBold}
                size={IconSize.Xs}
                color={IconColor.IconInverse}
              />
            </Box>
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="mt-4 w-full"
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="w-full"
        >
          {description}
        </Text>
      </Box>
    </ButtonBase>
  );
};

/**
 * Presents the Lite and Pro Perps modes without owning or persisting selection
 * state. The parent supplies the selected mode and handles selection changes.
 */
const PerpsModeSelectionBottomSheet = ({
  isVisible = true,
  selectedMode = PerpsMode.Lite,
  onSelect,
  onClose,
}: PerpsModeSelectionBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={onClose}
      testID={PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER}
    >
      <BottomSheetHeader
        testID={PerpsModeSelectionBottomSheetSelectorsIDs.TITLE}
      >
        {strings('perps.mode.selection_title')}
      </BottomSheetHeader>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Stretch}
        gap={3}
        paddingHorizontal={4}
        paddingTop={3}
        paddingBottom={4}
      >
        <ModeCard
          mode={PerpsMode.Lite}
          title={strings('perps.mode.lite')}
          description={strings('perps.mode.lite_description')}
          isSelected={selectedMode === PerpsMode.Lite}
          onPress={() => onSelect(PerpsMode.Lite)}
        />
        <ModeCard
          mode={PerpsMode.Pro}
          title={strings('perps.mode.pro')}
          description={strings('perps.mode.pro_description')}
          isSelected={selectedMode === PerpsMode.Pro}
          onPress={() => onSelect(PerpsMode.Pro)}
        />
      </Box>
    </BottomSheet>
  );
};

export default PerpsModeSelectionBottomSheet;
