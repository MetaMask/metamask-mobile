import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PendingSpinner from '../PendingSpinner/PendingSpinner';
import MoneyMfaInfoSheet from './MoneyMfaInfoSheet';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

/** Shown instead of Send while the Money account is still being set up. */
const MoneyMfaSettingUpSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const close = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);

  return (
    <MoneyMfaInfoSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      onClose={close}
      testID={MoneyMfaTestIds.SETTING_UP_SHEET}
      bottomSheetName={BOTTOM_SHEET_NAMES.MONEY_MFA_SETTING_UP_SHEET}
      icon={<PendingSpinner size={IconSize.Xl} />}
      title={strings('money.mfa.send_blocked_title')}
      description={strings('money.mfa.send_blocked_description')}
    >
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={close}
        testID={MoneyMfaTestIds.SETTING_UP_SHEET_BUTTON}
      >
        {strings('money.mfa.got_it')}
      </Button>
    </MoneyMfaInfoSheet>
  );
};

export default MoneyMfaSettingUpSheet;
