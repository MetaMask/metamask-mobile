import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import MoneyMfaInfoSheet from './MoneyMfaInfoSheet';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';

/** Confirms turning off 2-step verification for the Money account. */
const MoneyMfaTurnOffSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { turnOff } = useMoneyMfa();
  const close = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);
  const { trackButtonClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MFA_TURN_OFF_SHEET,
  });

  const handleTurnOff = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.DISABLE_MFA,
      label_key: 'money.mfa.turn_off_cta',
    });
    sheetRef.current?.onCloseBottomSheet(turnOff);
  }, [trackButtonClicked, turnOff]);

  const handleCancel = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.DISMISS,
      label_key: 'money.mfa.cancel',
    });
    close();
  }, [close, trackButtonClicked]);

  return (
    <MoneyMfaInfoSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      onClose={close}
      testID={MoneyMfaTestIds.TURN_OFF_SHEET}
      bottomSheetName={BOTTOM_SHEET_NAMES.MONEY_MFA_TURN_OFF_SHEET}
      icon={
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.ErrorDefault}
        />
      }
      title={strings('money.mfa.turn_off_title')}
      description={strings('money.mfa.turn_off_description')}
    >
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isDanger
        onPress={handleTurnOff}
        testID={MoneyMfaTestIds.TURN_OFF_BUTTON}
      >
        {strings('money.mfa.turn_off_cta')}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={handleCancel}
        testID={MoneyMfaTestIds.TURN_OFF_CANCEL_BUTTON}
      >
        {strings('money.mfa.cancel')}
      </Button>
    </MoneyMfaInfoSheet>
  );
};

export default MoneyMfaTurnOffSheet;
