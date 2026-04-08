import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, TextStyle } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Transaction } from '@metamask/keyring-api';
import { capitalize } from 'lodash';

import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { TextColor } from '../../../component-library/components/Texts/Text/Text.types';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

import { MultichainTransactionDisplayData } from '../../hooks/useMultichainTransactionDisplay';
import { toDateFormat } from '../../../util/date';
import { formatAddress } from '../../../util/address';
import StatusText from '../../Base/StatusText';
import { strings } from '../../../../locales/i18n';
import {
  getAddressUrl,
  getTransactionUrl,
} from '../../../core/Multichain/utils';
import Routes from '../../../constants/navigation/Routes';
import { useTheme } from '../../../util/theme';

export interface MultichainTransactionDetailsSheetParams {
  displayData: MultichainTransactionDisplayData;
  transaction: Transaction;
}

type MultichainTransactionDetailsSheetRouteProp = RouteProp<
  { params: MultichainTransactionDetailsSheetParams },
  'params'
>;

const TransactionDetailRow = {
  Status: strings('transactions.status'),
  TransactionID: strings('transactions.transaction_id'),
  From: strings('transactions.from'),
  To: strings('transactions.to'),
  Amount: strings('transactions.amount'),
  NetworkFee: strings('transactions.network_fee'),
  PriorityFee: strings('transactions.multichain_priority_fee'),
} as const;

const MultichainTransactionDetailsSheet: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MultichainTransactionDetailsSheetRouteProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { typography } = useTheme();

  const { displayData, transaction } = route.params;
  const { title, from, to, baseFee, priorityFee } = displayData;
  const { id, timestamp, chain, status } = transaction;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const viewOnBlockExplorer = useCallback(
    (label: string) => {
      let url = '';
      switch (label) {
        case TransactionDetailRow.TransactionID:
          url = getTransactionUrl(id, chain);
          break;
        case TransactionDetailRow.From:
          url = getAddressUrl(from?.address || '', chain);
          break;
        case TransactionDetailRow.To:
          url = getAddressUrl(to?.address || '', chain);
          break;
        default:
          break;
      }

      if (!url) return;

      // Close the bottom sheet and navigate to webview
      sheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(
          Routes.WEBVIEW.MAIN as never,
          {
            screen: Routes.WEBVIEW.SIMPLE,
            params: { url },
          } as never,
        );
      });
    },
    [id, chain, from?.address, to?.address, navigation],
  );

  const renderDetailRow = (
    label: string,
    value: string,
    isLink: boolean = false,
  ) => (
    <Box
      key={label}
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      twClassName="py-3 border-b border-muted"
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
        {label}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {isLink ? (
          <TouchableOpacity onPress={() => viewOnBlockExplorer(label)}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                {formatAddress(value, 'short')}
              </Text>
              <Icon
                name={IconName.Export}
                size={IconSize.Sm}
                color={IconColor.Primary}
              />
            </Box>
          </TouchableOpacity>
        ) : label === TransactionDetailRow.Status ? (
          <StatusText
            testID={`transaction-status-${transaction.id}`}
            status={status}
            style={typography.sBodyMDBold as TextStyle}
            context="transaction"
          />
        ) : (
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {value}
          </Text>
        )}
      </Box>
    </Box>
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>{title}</Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {timestamp && toDateFormat(new Date(timestamp * 1000))}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        {renderDetailRow(TransactionDetailRow.Status, capitalize(status))}
        {renderDetailRow(TransactionDetailRow.TransactionID, id, true)}
        {from?.address &&
          renderDetailRow(TransactionDetailRow.From, from.address, true)}
        {to?.address &&
          renderDetailRow(TransactionDetailRow.To, to.address, true)}
        {to &&
          renderDetailRow(
            TransactionDetailRow.Amount,
            `${to.amount} ${to.unit}`,
          )}
        {baseFee &&
          renderDetailRow(
            TransactionDetailRow.NetworkFee,
            `${baseFee.amount} ${baseFee.unit}`,
          )}
        {priorityFee &&
          renderDetailRow(
            TransactionDetailRow.PriorityFee,
            `${priorityFee.amount} ${priorityFee.unit}`,
          )}
      </Box>

      <Box twClassName="px-4">
        <Button
          variant={ButtonVariants.Link}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          label={strings('networks.view_details')}
          onPress={() =>
            viewOnBlockExplorer(TransactionDetailRow.TransactionID)
          }
          endIconName={IconName.Export}
        />
      </Box>
    </BottomSheet>
  );
};

export default MultichainTransactionDetailsSheet;
