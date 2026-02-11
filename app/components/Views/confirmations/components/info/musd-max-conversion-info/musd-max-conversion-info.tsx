import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../../hooks/useStyles';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useAlerts } from '../../../context/alert-system-context';
import { RelayYouReceiveRow } from '../../rows/relay-you-receive-row';
import { TotalRow } from '../../rows/total-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { AssetType } from '../../../types/token';
import musdMaxConversionInfoStyleSheet from './musd-max-conversion-info.styles';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PercentageRow } from '../../rows/percentage-row';
import { MusdMaxConversionAssetHeader } from './musd-max-conversion-asset-header';

/**
 * Navigation params for MusdMaxConversionInfo
 */
export interface MusdMaxConversionParams {
  token: AssetType;
}

/**
 * Test IDs for the MusdMaxConversionInfo component.
 */
// TODO: Consider centralizing these test IDs in a separate file later.
export const MusdMaxConversionInfoTestIds = {
  CONTAINER: 'musd-max-conversion-info-container',
  ASSET_HEADER_SKELETON: 'musd-max-conversion-info-asset-header-skeleton',
  LOADING: 'musd-max-conversion-info-loading',
  CONFIRM_BUTTON: 'musd-max-conversion-info-confirm-button',
  ASSET_HEADER: 'musd-max-conversion-info-asset-header',
  AMOUNT_ROW: 'musd-max-conversion-info-amount-row',
  FEE_ROW: 'musd-max-conversion-info-fee-row',
  TOTAL_ROW: 'musd-max-conversion-info-total-row',
  EARNING_ROW: 'musd-max-conversion-info-earning-row',
  ERROR: 'musd-max-conversion-info-error',
} as const;

/**
 * Info component for max-amount mUSD conversion within the confirmations flow.
 *
 * This component:
 * 1. Displays loading state while transaction is being created and quotes are being fetched
 * 2. Shows fee and total information from TransactionPayController
 * 3. Uses standard confirmation components and hooks
 */
export const MusdMaxConversionInfo = () => {
  const { styles } = useStyles(musdMaxConversionInfoStyleSheet, {});
  const networkName = useSelector(selectNetworkName);

  // TODO: Check if there's a confirmations hook that can be used to get the token instead of using navigation params.
  // Get token from navigation params
  const { token } = useParams<MusdMaxConversionParams>();

  const quotes = useTransactionPayQuotes();

  // Transaction and quote data
  const transactionMetadata = useTransactionMetadataRequest();
  const isQuoteLoading = useIsTransactionPayLoading();

  // Confirmation actions
  const { onConfirm } = useTransactionConfirm();
  const { hasBlockingAlerts } = useAlerts();

  const formatFiat = useFiatFormatter();
  // Derived state
  const isLoading =
    !transactionMetadata || isQuoteLoading || quotes?.length === 0;
  // Confirm button disabled state
  const isConfirmDisabled = isLoading || hasBlockingAlerts;

  return (
    <View
      style={styles.container}
      testID={MusdMaxConversionInfoTestIds.CONTAINER}
    >
      {/* Asset Header */}
      <MusdMaxConversionAssetHeader
        token={token}
        networkName={networkName}
        formatFiat={formatFiat}
      />

      {/* Details Section */}
      <View style={styles.detailsSection}>
        <RelayYouReceiveRow
          label={strings('earn.musd_conversion.you_receive')}
          testID={MusdMaxConversionInfoTestIds.AMOUNT_ROW}
        />

        <BridgeFeeRow />
        <TotalRow />

        {/* Earning Row */}
        <PercentageRow />
      </View>

      {/* Confirm Button */}
      <View style={styles.buttonContainer}>
        <Button
          onPress={onConfirm}
          label={strings('earn.musd_conversion.convert')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          isDisabled={isConfirmDisabled}
          testID={MusdMaxConversionInfoTestIds.CONFIRM_BUTTON}
        />
      </View>
    </View>
  );
};
