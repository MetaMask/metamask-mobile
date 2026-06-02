import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { forwardRef, useImperativeHandle } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';
import { PREDICT_BALANCE_TEST_IDS } from '../PredictBalance/PredictBalance.testIds';

export type PredictWithdrawUnavailableSheetRef = PredictBottomSheetRef;

/**
 * Temporary migration notice for Deposit Wallet users.
 * Remove this sheet and its trigger once Deposit Wallet withdrawals are supported.
 */
const PredictWithdrawUnavailableSheet = forwardRef<PredictBottomSheetRef>(
  (_props, ref) => {
    const {
      sheetRef,
      isVisible,
      closeSheet,
      handleSheetClosed,
      getRefHandlers,
    } = usePredictBottomSheet();

    useImperativeHandle(ref, getRefHandlers, [getRefHandlers]);

    if (!isVisible) {
      return null;
    }

    return (
      <BottomSheet
        ref={sheetRef}
        isInteractable
        onClose={handleSheetClosed}
        testID={PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_SHEET}
      >
        <BottomSheetHeader
          onClose={closeSheet}
          closeButtonProps={{
            testID: PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_CLOSE_BUTTON,
          }}
          titleTestID={PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_TITLE}
        >
          {strings('predict.withdraw.unavailable_title')}
        </BottomSheetHeader>
        <Box
          alignItems={BoxAlignItems.Start}
          paddingHorizontal={4}
          paddingBottom={4}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_DESCRIPTION}
          >
            {strings('predict.withdraw.unavailable_description')}
          </Text>
        </Box>
        <BottomSheetFooter
          twClassName="px-4"
          primaryButtonProps={{
            children: strings('predict.withdraw.unavailable_got_it'),
            onPress: closeSheet,
            testID: PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_GOT_IT_BUTTON,
          }}
        />
      </BottomSheet>
    );
  },
);

PredictWithdrawUnavailableSheet.displayName = 'PredictWithdrawUnavailableSheet';

export default PredictWithdrawUnavailableSheet;
