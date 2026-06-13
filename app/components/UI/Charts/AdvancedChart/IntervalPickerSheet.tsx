import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

export const INTERVALS = ['1M', '5M', '15M', '1H', '4H', '1D'] as const;

const INTERVAL_SECTIONS = [
  {
    titleKey: 'asset_overview.interval_section_minutes',
    intervals: ['1M', '5M', '15M'] as string[],
  },
  {
    titleKey: 'asset_overview.interval_section_hours',
    intervals: ['1H', '4H'] as string[],
  },
  {
    titleKey: 'asset_overview.interval_section_days',
    intervals: ['1D'] as string[],
  },
];

export interface IntervalPickerSheetParams {
  selectedInterval: string;
  onSelect?: (interval: string) => void;
}

export const createIntervalPickerNavDetails =
  createNavigationDetails<IntervalPickerSheetParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.INTERVAL_PICKER,
  );

const IntervalPickerSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { selectedInterval, onSelect } = useParams<IntervalPickerSheetParams>();
  const { colors } = useTheme();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      paddingHorizontal: 8,
    },
    pill: {
      width: '18%',
      height: 48,
      paddingVertical: 4,
      paddingHorizontal: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      marginRight: '2%',
      borderRadius: 12,
      backgroundColor: colors.background.muted,
    },
    pillActive: {
      backgroundColor: colors.text.default,
      borderWidth: 1,
      borderColor: colors.text.default,
    },
    sectionTitle: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    sectionSpacing: {
      marginTop: 16,
    },
  });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSelect = useCallback(
    (interval: string) => {
      onSelect?.(interval);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  return (
    <BottomSheet ref={sheetRef} goBack={handleGoBack}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('asset_overview.interval_picker_title')}
      </BottomSheetHeader>
      <Box>
        {INTERVAL_SECTIONS.map((section, idx) => (
          <Box
            key={section.titleKey}
            style={idx > 0 ? styles.sectionSpacing : undefined}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextAlternative}
              style={styles.sectionTitle}
            >
              {strings(section.titleKey)}
            </Text>
            <Box style={styles.grid}>
              {section.intervals.map((interval) => {
                const isSelected = interval === selectedInterval;
                return (
                  <TouchableOpacity
                    key={interval}
                    style={[styles.pill, isSelected && styles.pillActive]}
                    onPress={() => handleSelect(interval)}
                    accessibilityRole="button"
                    accessibilityLabel={interval}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      variant={
                        isSelected ? TextVariant.BodyMd : TextVariant.BodySm
                      }
                      fontWeight={
                        isSelected ? FontWeight.Bold : FontWeight.Medium
                      }
                      color={TextColor.TextDefault}
                      style={
                        isSelected
                          ? { color: colors.background.default }
                          : undefined
                      }
                    >
                      {interval.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </BottomSheet>
  );
};

export default IntervalPickerSheet;
