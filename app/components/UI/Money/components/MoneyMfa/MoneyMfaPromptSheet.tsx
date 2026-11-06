import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import { moneyMfaStore } from '../../../../../lib/Money/mfa/moneyMfaStore';
import MoneyMfaPasskeyIntro from './MoneyMfaPasskeyIntro';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';

/** Home prompt to protect the funded wallet's Money account with a passkey. */
const MoneyMfaPromptSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { addPasskeyAndTurnOn } = useMoneyMfa();
  const { trackBottomSheetViewed, trackButtonClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MFA_PROMPT_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleClose = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.ICON,
      button_intent: MONEY_BUTTON_INTENTS.DISMISS,
    });
    moneyMfaStore.setState({ isHomePromptDismissed: true });
    sheetRef.current?.onCloseBottomSheet();
  }, [trackButtonClicked]);

  const handleAddPasskey = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
      label_key: 'money.mfa.intro_cta',
    });
    sheetRef.current?.onCloseBottomSheet(() => {
      void addPasskeyAndTurnOn();
    });
  }, [addPasskeyAndTurnOn, trackButtonClicked]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={MoneyMfaTestIds.PROMPT_SHEET}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: MoneyMfaTestIds.PROMPT_SHEET_CLOSE }}
      />
      <MoneyMfaPasskeyIntro onAddPasskey={handleAddPasskey} />
    </BottomSheet>
  );
};

export default MoneyMfaPromptSheet;
