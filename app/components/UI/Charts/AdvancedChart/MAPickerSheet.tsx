import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
  Checkbox,
  Button,
  ButtonVariant,
  ButtonSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { getMAOptions } from './indicatorColors';

export interface MAPickerSheetParams {
  selectedMAs?: string[];
  onDone?: (selected: string[]) => void;
}

export const createMAPickerNavDetails =
  createNavigationDetails<MAPickerSheetParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.MA_PICKER,
  );

const MAPickerSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const maOptions = useMemo(
    () => getMAOptions(themeAppearance),
    [themeAppearance],
  );
  const { selectedMAs, onDone } = useParams<MAPickerSheetParams>();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedMAs ?? []),
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleDone = useCallback(() => {
    onDone?.([...selected]);
    sheetRef.current?.onCloseBottomSheet();
  }, [onDone, selected]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggle = useCallback((label: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  return (
    <BottomSheet ref={sheetRef} goBack={handleGoBack}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('asset_overview.ma_picker_title')}
      </BottomSheetHeader>
      <Box>
        {maOptions.map(({ label, color }) => {
          const isSelected = selected.has(label);
          return (
            <Pressable
              key={label}
              style={({ pressed }) =>
                tw.style(
                  'flex-row items-center justify-between px-4 py-4',
                  pressed && 'opacity-70',
                )
              }
              onPress={() => handleToggle(label)}
              accessibilityRole="checkbox"
              accessibilityLabel={label}
              accessibilityState={{ checked: isSelected }}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <View
                  style={[
                    tw.style('w-2 h-2 rounded-full mr-3'),
                    { backgroundColor: color },
                  ]}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Regular}
                  twClassName="text-text-default"
                >
                  {label}
                </Text>
              </Box>
              <Checkbox
                isSelected={isSelected}
                onChange={() => handleToggle(label)}
                accessibilityLabel={label}
              />
            </Pressable>
          );
        })}
      </Box>
      <Box twClassName="px-4 pt-2 pb-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleDone}
          isFullWidth
        >
          {strings('asset_overview.done')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default MAPickerSheet;
