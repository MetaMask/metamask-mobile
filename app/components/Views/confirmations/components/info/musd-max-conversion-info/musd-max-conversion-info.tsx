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
import { TotalRow } from '../../rows/total-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { AssetType } from '../../../types/token';
import musdMaxConversionInfoStyleSheet from './musd-max-conversion-info.styles';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PercentageRow } from '../../rows/percentage-row';
import { MusdMaxConversionAssetHeader } from './musd-max-conversion-asset-header';
import { useNoPayTokenQuotesAlert } from '../../../hooks/alerts/useNoPayTokenQuotesAlert';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { MUSD_TOKEN } from '../../../../../UI/Earn/constants/musd';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';

interface RateRowProps {
  tokenSymbol: string;
  isLoading: boolean;
}

const RateRowTestIds = {
  CONTAINER: 'rate-row-container',
  SKELETON: 'rate-row-skeleton',
} as const;

const RateRow = ({ tokenSymbol, isLoading }: RateRowProps) => {
  if (isLoading) {
    return <InfoRowSkeleton testId={RateRowTestIds.SKELETON} />;
  }

  return (
    <InfoRow
      label={strings('earn.musd_conversion.rate')}
      testID={RateRowTestIds.CONTAINER}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {`1 ${tokenSymbol} = 1 ${MUSD_TOKEN.symbol}`}
      </Text>
    </InfoRow>
  );
};

/**
 * Navigation params for MusdMaxConversionInfo
 */
export interface MusdMaxConversionParams {
  token: AssetType;
}

/**
 * Test IDs for the MusdMaxConversionInfo component.
 */
export const MusdMaxConversionInfoTestIds = {
  CONTAINER: 'musd-max-conversion-info-container',
  ASSET_HEADER_SKELETON: 'musd-max-conversion-info-asset-header-skeleton',
  LOADING: 'musd-max-conversion-info-loading',
  CONFIRM_BUTTON: 'musd-max-conversion-info-confirm-button',
  ASSET_HEADER: 'musd-max-conversion-info-asset-header',
  FEE_ROW: 'musd-max-conversion-info-fee-row',
  TOTAL_ROW: 'musd-max-conversion-info-total-row',
  EARNING_ROW: 'musd-max-conversion-info-earning-row',
  ERROR: 'musd-max-conversion-info-error',
} as const;

export const MusdMaxConversionInfo = () => {
  const { styles } = useStyles(musdMaxConversionInfoStyleSheet, {});
  const networkName = useSelector(selectNetworkName);

  const { token } = useParams<MusdMaxConversionParams>();

  const quotes = useTransactionPayQuotes();

  const transactionMetadata = useTransactionMetadataRequest();
  const isQuoteLoading = useIsTransactionPayLoading();
  const noPayTokenQuotesAlert = useNoPayTokenQuotesAlert();

  const { onConfirm } = useTransactionConfirm();
  const { hasBlockingAlerts } = useAlerts();

  const formatFiat = useFiatFormatter();

  const isLoading =
    !transactionMetadata || isQuoteLoading || quotes?.length === 0;

  const isConfirmDisabled = isLoading || hasBlockingAlerts;

  return (
    <View
      style={styles.container}
      testID={MusdMaxConversionInfoTestIds.CONTAINER}
    >
      {noPayTokenQuotesAlert.length > 0 ? (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Error}
          style={styles.errorText}
        >
          {strings('earn.musd_conversion.quick_convert.failed_to_get_quotes')}
        </Text>
      ) : (
        <>
          <MusdMaxConversionAssetHeader
            token={token}
            networkName={networkName}
            formatFiat={formatFiat}
          />
          <View style={styles.detailsSection}>
            <RateRow tokenSymbol={token.symbol} isLoading={isLoading} />
            <BridgeFeeRow />
            <TotalRow />
            <PercentageRow />
          </View>
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
        </>
      )}
    </View>
  );
};
