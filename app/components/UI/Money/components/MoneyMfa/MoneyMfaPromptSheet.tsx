import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { dismissBanner } from '../../../../../reducers/banners';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import { MONEY_MFA_HOME_PROMPT_ID } from '../../hooks/useMoneyMfaHomePrompt';
import MoneyMfaPasskeyIntro from './MoneyMfaPasskeyIntro';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

/** Home prompt to protect the funded wallet's Money account with a passkey. */
const MoneyMfaPromptSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { addPasskeyAndTurnOn } = useMoneyMfa();

  const handleClose = useCallback(() => {
    dispatch(dismissBanner(MONEY_MFA_HOME_PROMPT_ID));
    sheetRef.current?.onCloseBottomSheet();
  }, [dispatch]);

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
