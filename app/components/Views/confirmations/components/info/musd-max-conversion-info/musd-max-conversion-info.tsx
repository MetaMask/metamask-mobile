import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../../util/theme';
import { useStyles } from '../../../../../hooks/useStyles';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { getNetworkImageSource } from '../../../../../../util/networks';
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
import styleSheet from './musd-max-conversion-info.styles';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import BigNumber from 'bignumber.js';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';

/**
 * Navigation params for MusdMaxConversionInfo
 */
export interface MusdMaxConversionParams {
  maxValueMode: boolean;
  outputChainId: string;
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
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
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

  // Render loading state
  if (isLoading) {
    return (
      <View
        style={styles.loadingContainer}
        testID={MusdMaxConversionInfoTestIds.LOADING}
      >
        <ActivityIndicator size="large" color={colors.primary.default} />
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('earn.musd_conversion.fetching_quote')}
        </Text>
      </View>
    );
  }

  // Render asset header with icon, symbol, and fiat amount
  const renderAssetHeader = () => (
    <View
      style={styles.assetHeader}
      testID={MusdMaxConversionInfoTestIds.ASSET_HEADER}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={getNetworkImageSource({
              chainId: token?.chainId ?? '',
            })}
          />
        }
      >
        <AvatarToken
          name={token.symbol}
          imageSource={{ uri: token.image }}
          size={AvatarSize.Lg}
          testID={`earn-token-avatar-${token.symbol}`}
        />
      </BadgeWrapper>
      <View style={styles.assetInfo}>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {token?.symbol}
        </Text>
        <Text variant={TextVariant.BodyLGMedium}>
          {token?.fiat?.balance
            ? formatFiat(new BigNumber(token.fiat.balance))
            : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={styles.container}
      testID={MusdMaxConversionInfoTestIds.CONTAINER}
    >
      {/* Asset Header */}
      {renderAssetHeader()}

      {/* Details Section */}
      <View style={styles.detailsSection}>
        {/* You Receive Row */}
        <InfoRow
          label={strings('earn.musd_conversion.you_receive')}
          rowVariant={InfoRowVariant.Small}
          testID={MusdMaxConversionInfoTestIds.AMOUNT_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {mUsdAmount} {MUSD_TOKEN.symbol}
          </Text>
        </InfoRow>

        {/* TODO: Only show Network fee instead of Network + Bridge fee rows */}
        <BridgeFeeRow />

        <TotalRow />

        {/* Earning Row */}
        <InfoRow
          label={strings('earn.musd_conversion.earning')}
          rowVariant={InfoRowVariant.Small}
          testID={MusdMaxConversionInfoTestIds.EARNING_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Success}>
            {/* TODO: Replace hardcoded 2% with constant until we have actual yield data */}
            2%
          </Text>
        </InfoRow>
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
