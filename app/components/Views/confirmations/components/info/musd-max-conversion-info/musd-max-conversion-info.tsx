import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useAlerts } from '../../../context/alert-system-context';
import { TotalRow } from '../../rows/total-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { AssetType } from '../../../types/token';
import stylesheet from './musd-max-conversion-info.styles';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PercentageRow } from '../../rows/percentage-row';
import { TokenConversionAssetHeader } from '../../token-conversion-asset-header';
import { BlockingAlertMessage } from '../../alerts/blocking-alert-message';
import { TokenConversionRateRow } from '../../rows/token-conversion-rate-row';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../../UI/Earn/constants/musd';
import { useConfirmationPrimaryAction } from '../../../hooks/alerts/useConfirmationPrimaryAction';

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

  const { token } = useParams<MusdMaxConversionParams>();

  const { onConfirm } = useTransactionConfirm();
  const { alerts } = useAlerts();

  const blockingAlert = alerts.find(
    (confirmationAlert) => confirmationAlert.isBlocking,
  );

  const formatFiat = useFiatFormatter();

  const { label: sharedPrimaryLabel, isDisabled: isConfirmDisabled } =
    useConfirmationPrimaryAction();

  const buttonLabel = useMemo(
    () =>
      blockingAlert?.title ??
      (sharedPrimaryLabel === strings('confirm.confirm')
        ? strings('earn.musd_conversion.convert')
        : sharedPrimaryLabel),
    [blockingAlert, sharedPrimaryLabel],
  );

  const outputToken = useMemo((): AssetType => {
    const imageUri =
      Image.resolveAssetSource(MUSD_TOKEN.imageSource)?.uri ?? '';

    return {
      address: MUSD_TOKEN_ADDRESS,
      symbol: MUSD_TOKEN.symbol,
      name: MUSD_TOKEN.name,
      decimals: MUSD_TOKEN.decimals,
      image: imageUri,
      balance: '0',
      logo: imageUri,
      isETH: false,
      chainId: token.chainId,
    };
  }, [token.chainId]);

  return (
    <View
      style={styles.container}
      testID={MusdMaxConversionInfoTestIds.CONTAINER}
    >
      <TokenConversionAssetHeader
        inputToken={token}
        outputToken={outputToken}
        formatFiat={formatFiat}
      />
      <View style={styles.detailsSection}>
        <TokenConversionRateRow />
        <BridgeFeeRow />
        <TotalRow />
        <PercentageRow />
      </View>
      <BlockingAlertMessage />
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
