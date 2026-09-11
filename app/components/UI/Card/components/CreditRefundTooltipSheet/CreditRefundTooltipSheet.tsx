import React, { useCallback, useRef } from 'react';
import {
  Text,
  TextVariant,
  Box,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { CreditRefundTooltipSheetSelectors } from './CreditRefundTooltipSheet.testIds';

const CreditRefundTooltipSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { params } =
    useRoute<RouteProp<{ params: { isMoneyAccount?: boolean } }, 'params'>>();
  const isMoneyAccount = params?.isMoneyAccount ?? false;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={CreditRefundTooltipSheetSelectors.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={CreditRefundTooltipSheetSelectors.CLOSE_BUTTON}
      >
        <Text
          variant={TextVariant.HeadingSm}
          testID={CreditRefundTooltipSheetSelectors.TITLE}
        >
          {strings('card.credit_screen.refund_info.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative"
          testID={CreditRefundTooltipSheetSelectors.DESCRIPTION}
        >
          {strings(
            isMoneyAccount
              ? 'card.credit_screen.refund_info.description'
              : 'card.credit_screen.refund_info.description_no_money_account',
          )}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default CreditRefundTooltipSheet;
