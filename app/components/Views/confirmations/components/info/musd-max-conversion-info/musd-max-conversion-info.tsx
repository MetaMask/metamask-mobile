import React, { useMemo } from 'react';
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
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useAlerts } from '../../../context/alert-system-context';
import { TotalRow } from '../../rows/total-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { AssetType } from '../../../types/token';
import stylesheet from './musd-max-conversion-info.styles';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PercentageRow } from '../../rows/percentage-row';
import { MusdMaxConversionAssetHeader } from './musd-max-conversion-asset-header';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { TokenConversionRateRow } from '../../rows/token-conversion-rate-row';

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
  CONFIRM_BUTTON: 'musd-max-conversion-info-confirm-button',
} as const;

export const MusdMaxConversionInfo = () => {
  const { styles } = useStyles(stylesheet, {});
  const networkName = useSelector(selectNetworkName);

  const { token } = useParams<MusdMaxConversionParams>();

  const transactionMetadata = useTransactionMetadataRequest();
  const isQuoteLoading = useIsTransactionPayLoading();

  const { onConfirm } = useTransactionConfirm();
  const { alerts } = useAlerts();

  const blockingAlert = alerts.find(
    (confirmationAlert) => confirmationAlert.isBlocking,
  );

  const formatFiat = useFiatFormatter();

  const isLoading = !transactionMetadata || isQuoteLoading;

  const isConfirmDisabled = isLoading || Boolean(blockingAlert);

  const buttonLabel = useMemo(
    () => blockingAlert?.title ?? strings('earn.musd_conversion.convert'),
    [blockingAlert],
  );

  return (
    <View
      style={styles.container}
      testID={MusdMaxConversionInfoTestIds.CONTAINER}
    >
      <MusdMaxConversionAssetHeader
        token={token}
        networkName={networkName}
        formatFiat={formatFiat}
      />
      <View style={styles.detailsSection}>
        <TokenConversionRateRow />
        <BridgeFeeRow />
        <TotalRow />
        <PercentageRow />
      </View>
      {blockingAlert?.message && (
        <View style={styles.errorTextContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {blockingAlert?.message}
          </Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <Button
          onPress={onConfirm}
          label={buttonLabel}
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
