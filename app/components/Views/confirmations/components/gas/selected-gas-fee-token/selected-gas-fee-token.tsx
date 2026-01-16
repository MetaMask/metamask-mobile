import React, { useCallback, useState } from 'react';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { useSelectedGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../hooks/gas/useIsGaslessSupported';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useIsInsufficientBalance } from '../../../hooks/useIsInsufficientBalance';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { GasFeeTokenIcon, GasFeeTokenIconSize } from '../gas-fee-token-icon';
import { GasFeeTokenModal } from '../gas-fee-token-modal';
import styleSheet from './selected-gas-fee-token.styles';

export function SelectedGasFeeToken() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const { chainId: chainIdSingle, gasFeeTokens } = transactionMetadata || {};
  const { chainId: chainIdBatch } = transactionBatchesMetadata || {};
  const chainId = chainIdSingle ?? chainIdBatch;
  const hasGasFeeTokens = Boolean(gasFeeTokens?.length);

  const { styles } = useStyles(styleSheet, {
    hasGasFeeTokens,
  });

  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();

  const hasInsufficientNative = useIsInsufficientBalance();

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
        disabled={!supportsGasFeeTokens}
      >
        <GasFeeTokenIcon
          tokenAddress={gasFeeToken?.tokenAddress ?? NATIVE_TOKEN_ADDRESS}
          size={GasFeeTokenIconSize.Sm}
        />
        <Text testID="selected-gas-fee-token-symbol">{symbol}</Text>
        {supportsGasFeeTokens && (
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
