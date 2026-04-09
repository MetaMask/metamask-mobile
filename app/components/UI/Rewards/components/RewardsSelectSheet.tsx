import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';

export const REWARDS_SELECT_SHEET_TEST_IDS = {
  CONTAINER: 'rewards-select-sheet',
  OPTION: 'rewards-select-option',
} as const;

export interface RewardsSelectOption {
  key: string;
  label: string;
  value: string;
}

export interface RewardsSelectSheetParams {
  title: string;
  options: RewardsSelectOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
}

interface RewardsSelectSheetProps {
  route: {
    params: RewardsSelectSheetParams;
  };
}

const RewardsSelectSheet: React.FC<RewardsSelectSheetProps> = ({ route }) => {
  const { title, options, selectedValue, onSelect } = route.params;
  const navigation = useNavigation();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelect = useCallback(
    (value: string) => {
      navigation.goBack();
      onSelect(value);
    },
    [onSelect, navigation],
  );

  return (
    <BottomSheet testID={REWARDS_SELECT_SHEET_TEST_IDS.CONTAINER}>
      <BottomSheetHeader onClose={handleClose}>{title}</BottomSheetHeader>
      <Box twClassName="pb-4">
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => handleSelect(option.value)}
            testID={`${REWARDS_SELECT_SHEET_TEST_IDS.OPTION}-${option.key}`}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName={`px-4 py-4 ${
                option.value === selectedValue ? 'bg-background-muted' : ''
              }`}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {option.label}
              </Text>
              {option.value === selectedValue && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Sm}
                  color={IconColor.IconDefault}
                />
              )}
            </Box>
          </Pressable>
        ))}
      </Box>
    </BottomSheet>
  );
};

export default RewardsSelectSheet;
