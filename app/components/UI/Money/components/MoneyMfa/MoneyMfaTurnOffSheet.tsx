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

/** Confirms turning off 2-step verification for the Money account. */
const MoneyMfaTurnOffSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { turnOff } = useMoneyMfa();
  const close = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);

  const handleTurnOff = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(turnOff);
  }, [turnOff]);

  return (
    <MoneyMfaInfoSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      onClose={close}
      testID={MoneyMfaTestIds.TURN_OFF_SHEET}
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
        onPress={close}
        testID={MoneyMfaTestIds.TURN_OFF_CANCEL_BUTTON}
      >
        {strings('money.mfa.cancel')}
      </Button>
    </MoneyMfaInfoSheet>
  );
};

export default MoneyMfaTurnOffSheet;
