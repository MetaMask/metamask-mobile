import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import type {
  NotificationPreferences,
  TxAmountThreshold,
} from '../../../NotificationPreferencesView/hooks';
import AllowPushNotificationsRow from '../../../NotificationPreferencesView/components/AllowPushNotificationsRow';
import ThresholdRadioList from '../../../NotificationPreferencesView/components/ThresholdRadioList';
import { TopTradersNotificationsSetupBottomSheetSelectorsIDs } from './TopTradersNotificationsSetupBottomSheet.testIds';

export interface TopTradersNotificationsSetupBottomSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

interface TopTradersNotificationsSetupBottomSheetProps {
  preferences: NotificationPreferences;
  setEnabled: (value: boolean) => void;
  setTxAmountLimit: (value: TxAmountThreshold) => void;
  onDismiss?: () => void;
}

const TopTradersNotificationsSetupBottomSheet = forwardRef<
  TopTradersNotificationsSetupBottomSheetRef,
  TopTradersNotificationsSetupBottomSheetProps
>(({ preferences, setEnabled, setTxAmountLimit, onDismiss }, ref) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tw = useTailwind();
  const currentCurrency = useSelector(selectCurrentCurrency);

  const handleSheetClosed = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const closeSheet = useCallback(() => {
    if (!sheetRef.current) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }
    sheetRef.current.onCloseBottomSheet(() => {
      setIsVisible(false);
    });
  }, [onDismiss]);

  useImperativeHandle(
    ref,
    () => ({
      onOpenBottomSheet: () => {
        if (!isVisible) {
          setIsVisible(true);
          return;
        }
        sheetRef.current?.onOpenBottomSheet();
      },
      onCloseBottomSheet: () => {
        closeSheet();
      },
    }),
    [closeSheet, isVisible],
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleSave = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      isInteractable
      onClose={handleSheetClosed}
      testID={TopTradersNotificationsSetupBottomSheetSelectorsIDs.CONTAINER}
    >
      <HeaderCompactStandard
        title={strings('social_leaderboard.trader_notifications_setup.title')}
        titleProps={{
          variant: TextVariant.HeadingSm,
          fontWeight: FontWeight.Bold,
        }}
        onClose={closeSheet}
        closeButtonProps={{
          testID:
            TopTradersNotificationsSetupBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />

      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="px-4 pt-2 pb-4"
      >
        {strings('social_leaderboard.trader_notifications_setup.description')}
      </Text>

      <AllowPushNotificationsRow
        title={strings(
          'social_leaderboard.trader_notifications_setup.allow_push_notifications',
        )}
        value={preferences.enabled}
        onValueChange={setEnabled}
        toggleTestID={
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.TOGGLE
        }
      />

      <View style={tw.style('h-px bg-muted mx-4')} />

      <ThresholdRadioList
        selected={preferences.txAmountLimit}
        onChange={setTxAmountLimit}
        isDisabled={!preferences.enabled}
        currency={currentCurrency}
        labelText={strings(
          'social_leaderboard.trader_notifications_setup.trades_over_label',
        )}
        testIDForAmount={
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.THRESHOLD_OPTION
        }
      />

      <BottomSheetFooter
        buttonPropsArray={[
          {
            variant: ButtonVariants.Primary,
            label: strings(
              'social_leaderboard.trader_notifications_setup.save',
            ),
            onPress: handleSave,
            testID:
              TopTradersNotificationsSetupBottomSheetSelectorsIDs.SAVE_BUTTON,
          },
        ]}
        style={tw.style('px-4 mb-4')}
      />
    </BottomSheet>
  );
});

export default TopTradersNotificationsSetupBottomSheet;
