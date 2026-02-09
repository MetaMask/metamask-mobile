import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../../hooks/useStyles';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { MUSD_TOKEN } from '../../../../../UI/Earn/constants/musd';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../utils/transaction';
import { calcTokenAmount } from '../../../../../../util/transactions';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useAlerts } from '../../../context/alert-system-context';
import InfoRow, { InfoRowVariant } from '../../UI/info-row/info-row';
import { TotalRow } from '../../rows/total-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { AssetType } from '../../../types/token';
import musdMaxConversionInfoStyleSheet from './musd-max-conversion-info.styles';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PercentageRow } from '../../rows/percentage-row';
import {
  MusdMaxConversionAssetHeader,
  MusdMaxConversionAssetHeaderSkeleton,
} from './musd-max-conversion-asset-header';

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

  // Parse the mUSD receive amount from transaction metadata
  // This gives us the actual amount that will be converted (with percentage applied)
  const tokenTransferData = getTokenTransferData(transactionMetadata);
  const parsedData = parseStandardTokenTransactionData(tokenTransferData?.data);
  const amountRaw = parsedData?.args?._value?.toString() ?? '0';
  // Convert from raw (minimal units) to human-readable using token decimals
  const mUsdAmount = calcTokenAmount(
    amountRaw,
    token?.decimals ?? 18,
  ).toString();

  // Confirm button disabled state
  const isConfirmDisabled = isLoading || hasBlockingAlerts;

  return (
    <View
      style={styles.container}
      testID={MusdMaxConversionInfoTestIds.CONTAINER}
    >
      {/* Asset Header */}
      {isLoading ? (
        <MusdMaxConversionAssetHeaderSkeleton
          testID={MusdMaxConversionInfoTestIds.ASSET_HEADER}
        />
      ) : (
        <MusdMaxConversionAssetHeader
          token={token}
          networkName={networkName}
          formatFiat={formatFiat}
          testID={MusdMaxConversionInfoTestIds.ASSET_HEADER}
        />
      )}

      {/* Details Section */}
      <View style={styles.detailsSection}>
        {/* You Receive Row */}
        {/* TODO: Breakout into separate component */}
        <InfoRow
          label={strings('earn.musd_conversion.you_receive')}
          rowVariant={InfoRowVariant.Small}
          testID={MusdMaxConversionInfoTestIds.AMOUNT_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {mUsdAmount} {MUSD_TOKEN.symbol}
          </Text>
        </InfoRow>

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
