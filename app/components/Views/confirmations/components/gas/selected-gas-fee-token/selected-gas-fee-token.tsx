import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import Text from '../../../../../../component-library/components/Texts/Text/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import styleSheet from './selected-gas-fee-token.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import React, { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { GasFeeTokenIcon, GasFeeTokenIconSize } from '../gas-fee-token-icon';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { useInsufficientBalanceAlert } from '../../../hooks/alerts/useInsufficientBalanceAlert';
import { useSelectedGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../hooks/gas/useIsGaslessSupported';
import { GasFeeTokenModal } from '../gas-fee-token-modal';

export function SelectedGasFeeToken() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, gasFeeTokens } = transactionMetadata || {};
  const hasGasFeeTokens = Boolean(gasFeeTokens?.length);

  const { styles } = useStyles(styleSheet, {
    hasGasFeeTokens,
  });

  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();

  const hasInsufficientNative = Boolean(
    useInsufficientBalanceAlert({ ignoreGasFeeToken: true }).length,
  );

  const hasOnlyFutureNativeToken =
    gasFeeTokens?.length === 1 &&
    gasFeeTokens[0].tokenAddress === NATIVE_TOKEN_ADDRESS;

  const supportsFutureNative = hasInsufficientNative && isSmartTransaction;

  const supportsGasFeeTokens =
    isGaslessSupported &&
    hasGasFeeTokens &&
    (!hasOnlyFutureNativeToken || supportsFutureNative);

  const { networkNativeCurrency: nativeCurrency } = useNetworkInfo(chainId);

  const handlePress = useCallback(() => {
    if (!supportsGasFeeTokens) {
      return;
    }

    setIsModalOpen(true);
  }, [supportsGasFeeTokens]);

  const nativeTicker = nativeCurrency;
  const gasFeeToken = useSelectedGasFeeToken();
  const symbol = gasFeeToken?.symbol ?? nativeTicker;

  return (
    <>
      {isModalOpen && (
        <GasFeeTokenModal onClose={() => setIsModalOpen(false)} />
      )}
      <TouchableOpacity
        onPress={handlePress}
        style={styles.gasFeeTokenButton}
        testID="selected-gas-fee-token"
      >
        <GasFeeTokenIcon
          tokenAddress={gasFeeToken?.tokenAddress ?? NATIVE_TOKEN_ADDRESS}
          size={GasFeeTokenIconSize.Sm}
        />
        <Text>{symbol}</Text>
        {hasGasFeeTokens && (
          <Icon
            testID="selected-gas-fee-token-arrow"
            name={IconName.ArrowDown}
            size={IconSize.Xs}
          />
        )}
      </TouchableOpacity>
    </>
  );
}
