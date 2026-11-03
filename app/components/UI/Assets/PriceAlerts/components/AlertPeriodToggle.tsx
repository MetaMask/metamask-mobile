import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  ContentVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import {
  ALERT_PERIODS,
  type AlertPeriod,
  CreatePriceAlertTestIds,
  PERP_ALERT_PERIODS,
} from '../constants';

interface AlertPeriodToggleProps {
  value: AlertPeriod;
  onChange: (value: AlertPeriod) => void;
  includeFiveMinutes?: boolean;
}

const PERIOD_TEST_IDS = {
  '5m': CreatePriceAlertTestIds.PERIOD_SEGMENT_5M,
  '1h': CreatePriceAlertTestIds.PERIOD_SEGMENT_1H,
  '24h': CreatePriceAlertTestIds.PERIOD_SEGMENT_24H,
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const periodLabel = (period: AlertPeriod) =>
  strings(`price_alerts.period_${period}`);

interface AlertPeriodSheetProps {
  value: AlertPeriod;
  options: readonly AlertPeriod[];
  onChange: (value: AlertPeriod) => void;
  onClose: () => void;
}

/**
 * Mounted only while open. BottomSheetDialog animates in on mount.
 */
const AlertPeriodSheet: React.FC<AlertPeriodSheetProps> = ({
  value,
  options,
  onChange,
  onClose,
}) => {
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (next: AlertPeriod) => {
      if (next !== value) {
        playSelection().catch(() => undefined);
        onChange(next);
      }
      onClose();
    },
    [onChange, onClose, value],
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <Box twClassName="absolute inset-0">
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay.default },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              testID={CreatePriceAlertTestIds.PERIOD_SHEET_BACKDROP}
            />
            <BottomSheetDialog
              onClose={onClose}
              testID={CreatePriceAlertTestIds.PERIOD_SHEET}
            >
              <BottomSheetHeader onClose={onClose}>
                {strings('price_alerts.alert_period')}
              </BottomSheetHeader>
              <Box twClassName="pb-4">
                {options.map((option) => {
                  const isSelected = option === value;
                  return (
                    <ListItem
                      key={option}
                      isInteractive
                      variant={ContentVariant.OneLine}
                      title={periodLabel(option)}
                      onPress={() => handleSelect(option)}
                      twClassName={
                        isSelected ? 'h-[56px] bg-muted' : 'h-[56px]'
                      }
                      endAccessory={
                        isSelected ? (
                          <Icon
                            name={IconName.Check}
                            size={IconSize.Md}
                            color={IconColor.IconDefault}
                            testID={CreatePriceAlertTestIds.PERIOD_CHECK}
                          />
                        ) : undefined
                      }
                      accessibilityState={{ selected: isSelected }}
                      testID={PERIOD_TEST_IDS[option]}
                    />
                  );
                })}
              </Box>
            </BottomSheetDialog>
          </Box>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

/**
 * Tertiary button for the percent-change rolling window. The current period
 * is the label; pressing it opens a sheet of 24hr / 1hr, plus 5min for
 * perpetuals.
 */
const AlertPeriodToggle: React.FC<AlertPeriodToggleProps> = ({
  value,
  onChange,
  includeFiveMinutes = false,
}) => {
  const tw = useTailwind();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const options = includeFiveMinutes ? PERP_ALERT_PERIODS : ALERT_PERIODS;

  return (
    <>
      <Pressable
        onPress={() => setIsSheetOpen(true)}
        testID={CreatePriceAlertTestIds.PERIOD_SEGMENT}
        accessibilityRole="button"
        accessibilityLabel={periodLabel(value)}
        android_ripple={null}
        style={({ pressed }) =>
          tw.style(
            'h-8 flex-row items-center justify-center gap-1 self-center rounded-full pl-4 pr-0',
            pressed ? 'opacity-50' : 'opacity-100',
          )
        }
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {periodLabel(value)}
        </Text>
        <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
      </Pressable>
      {isSheetOpen ? (
        <AlertPeriodSheet
          value={value}
          options={options}
          onChange={onChange}
          onClose={() => setIsSheetOpen(false)}
        />
      ) : null}
    </>
  );
};

export default AlertPeriodToggle;
