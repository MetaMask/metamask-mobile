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
import React, { useEffect, useRef } from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import foxLogo from '../../../../../images/branding/fox.png';
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
      twClassName={(pressed) =>
        `h-[186px] flex-1 items-stretch rounded-xl border p-4 ${
          isSelected ? 'border-default' : 'border-transparent'
        } ${pressed ? 'bg-pressed' : 'bg-muted'}`
      }
      contentWrapperProps={{
        twClassName: 'h-full w-full items-stretch',
      }}
    >
      <Box twClassName="h-full w-full">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName={`size-14 rounded-full ${
              isLite ? 'bg-error-muted' : 'bg-warning-muted'
            }`}
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
                name={IconName.Candlestick}
                size={IconSize.Xl}
                color={IconColor.WarningDefault}
                testID={PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON}
              />
            )}
          </Box>
          {isSelected ? (
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Md}
              color={IconColor.IconDefault}
              testID={
                PerpsModeSelectionBottomSheetSelectorsIDs.SELECTED_INDICATOR
              }
            />
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="mt-4"
        >
          {title}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
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
