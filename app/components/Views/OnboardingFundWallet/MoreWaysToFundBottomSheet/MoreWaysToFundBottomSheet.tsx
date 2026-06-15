import React, { useCallback, useRef } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetHeader,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { MoreWaysToFundBottomSheetTestIds } from './MoreWaysToFundBottomSheet.testIds';
import {
  MORE_WAYS_TO_FUND_OPTIONS,
  MORE_WAYS_TO_FUND_SECTIONS,
} from './MoreWaysToFundBottomSheet.constants';
import type {
  MoreWaysToFundOptionId,
  MoreWaysToFundSectionId,
} from './MoreWaysToFundBottomSheet.types';

interface MoreWaysToFundBottomSheetProps {
  selectedOptionId?: MoreWaysToFundOptionId;
  onClose: () => void;
  onSelect: (optionId: MoreWaysToFundOptionId) => void;
}

interface MoreWaysOptionRowProps {
  optionId: MoreWaysToFundOptionId;
  isSelected: boolean;
  onPress: (optionId: MoreWaysToFundOptionId) => void;
}

const MoreWaysOptionRow = ({
  optionId,
  isSelected,
  onPress,
}: MoreWaysOptionRowProps) => {
  const tw = useTailwind();
  const option = MORE_WAYS_TO_FUND_OPTIONS.find((item) => item.id === optionId);

  if (!option) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(optionId)}
      style={tw.style(
        'flex-row items-center py-4',
        isSelected && 'bg-muted rounded-xl px-2',
      )}
      testID={`${MoreWaysToFundBottomSheetTestIds.OPTION_PREFIX}${optionId}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-10 w-10 rounded-full bg-muted"
      >
        <Icon name={option.iconName} size={IconSize.Md} />
      </Box>
      <Box twClassName="flex-1 ml-3">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings(option.labelKey)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-0.5"
        >
          {strings(option.descriptionKey)}
        </Text>
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </TouchableOpacity>
  );
};

const MoreWaysToFundBottomSheet = ({
  selectedOptionId,
  onClose,
  onSelect,
}: MoreWaysToFundBottomSheetProps) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleSelect = useCallback(
    (optionId: MoreWaysToFundOptionId) => {
      bottomSheetRef.current?.onCloseBottomSheet(() => {
        onSelect(optionId);
      });
    },
    [onSelect],
  );

  const getOptionsForSection = (sectionId: MoreWaysToFundSectionId) =>
    MORE_WAYS_TO_FUND_OPTIONS.filter((option) => option.section === sectionId);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      testID={MoreWaysToFundBottomSheetTestIds.BOTTOM_SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: `${MoreWaysToFundBottomSheetTestIds.BOTTOM_SHEET}-close-button`,
        }}
      >
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
          {strings('onboarding_fund_wallet.more_ways_sheet_title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView
        style={tw.style('max-h-[70%]')}
        contentContainerStyle={tw.style('px-4 pb-6')}
        showsVerticalScrollIndicator={false}
      >
        {MORE_WAYS_TO_FUND_SECTIONS.map((section, sectionIndex) => (
          <Box
            key={section.id}
            twClassName={
              sectionIndex > 0 ? 'mt-2 border-t border-border-muted pt-4' : ''
            }
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
              twClassName="uppercase mb-1"
            >
              {strings(section.titleKey)}
            </Text>
            <Box flexDirection={BoxFlexDirection.Column}>
              {getOptionsForSection(section.id).map((option) => (
                <MoreWaysOptionRow
                  key={option.id}
                  optionId={option.id}
                  isSelected={selectedOptionId === option.id}
                  onPress={handleSelect}
                />
              ))}
            </Box>
          </Box>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default MoreWaysToFundBottomSheet;
