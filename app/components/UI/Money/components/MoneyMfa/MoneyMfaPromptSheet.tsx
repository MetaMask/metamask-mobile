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

/** Home prompt to protect the funded wallet's Money account with a passkey. */
const MoneyMfaPromptSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { addPasskeyAndTurnOn } = useMoneyMfa();

  const handleClose = useCallback(() => {
    moneyMfaStore.setState({ isHomePromptDismissed: true });
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleAddPasskey = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      void addPasskeyAndTurnOn();
    });
  }, [addPasskeyAndTurnOn]);

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
