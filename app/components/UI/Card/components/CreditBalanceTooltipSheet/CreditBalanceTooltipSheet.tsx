import React, { useCallback, useRef } from 'react';
import {
  Text,
  TextVariant,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { CreditBalanceTooltipSheetSelectors } from './CreditBalanceTooltipSheet.testIds';

export interface CreditBalanceTooltipParams {
  moneyAccountAmount?: string;
  refundAmount?: string;
  isMoneyAccount?: boolean;
}

const CreditBalanceTooltipSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { params } =
    useRoute<RouteProp<{ params: CreditBalanceTooltipParams }, 'params'>>();
  const { moneyAccountAmount, refundAmount, isMoneyAccount } = params ?? {};

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={CreditBalanceTooltipSheetSelectors.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={CreditBalanceTooltipSheetSelectors.CLOSE_BUTTON}
      >
        <Text
          variant={TextVariant.HeadingSm}
          testID={CreditBalanceTooltipSheetSelectors.TITLE}
        >
          {strings('card.credit_balance_tooltip.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative"
          testID={CreditBalanceTooltipSheetSelectors.DESCRIPTION}
        >
          {strings(
            isMoneyAccount
              ? 'card.credit_balance_tooltip.description'
              : 'card.credit_balance_tooltip.description_no_money_account',
          )}
        </Text>

        <Box twClassName="mt-6">
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
            twClassName="py-3"
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings(
                isMoneyAccount
                  ? 'card.credit_balance_tooltip.money_account'
                  : 'card.credit_balance_tooltip.wallet',
              )}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-alternative"
              testID={CreditBalanceTooltipSheetSelectors.MONEY_ACCOUNT_AMOUNT}
            >
              {moneyAccountAmount ?? ''}
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
            twClassName="py-3"
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('card.credit_balance_tooltip.refund_balance')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-alternative"
              testID={CreditBalanceTooltipSheetSelectors.REFUND_AMOUNT}
            >
              {refundAmount ?? ''}
            </Text>
          </Box>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default CreditBalanceTooltipSheet;
