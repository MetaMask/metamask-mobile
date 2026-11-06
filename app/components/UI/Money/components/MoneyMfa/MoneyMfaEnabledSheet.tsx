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
import MoneyMfaInfoSheet from './MoneyMfaInfoSheet';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

/** Confirms that 2-step verification now protects the Money account. */
const MoneyMfaEnabledSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const close = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);

  return (
    <MoneyMfaInfoSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      onClose={close}
      testID={MoneyMfaTestIds.ENABLED_SHEET}
      bottomSheetName={BOTTOM_SHEET_NAMES.MONEY_MFA_ENABLED_SHEET}
      icon={
        <Icon
          name={IconName.SecurityTick}
          size={IconSize.Xl}
          color={IconColor.SuccessDefault}
        />
      }
      title={strings('money.mfa.enabled_title')}
      description={strings('money.mfa.enabled_description')}
    >
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={close}
        testID={MoneyMfaTestIds.ENABLED_SHEET_BUTTON}
      >
        {strings('money.mfa.got_it')}
      </Button>
    </MoneyMfaInfoSheet>
  );
};

export default MoneyMfaEnabledSheet;
