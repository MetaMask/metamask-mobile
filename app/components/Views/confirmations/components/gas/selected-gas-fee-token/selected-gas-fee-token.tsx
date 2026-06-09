import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { useEstimationFailed } from '../../../hooks/gas/useEstimationFailed';
import { useSelectedGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../hooks/gas/useIsGaslessSupported';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useIsInsufficientBalance } from '../../../hooks/useIsInsufficientBalance';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import { GasFeeTokenIcon, GasFeeTokenIconSize } from '../gas-fee-token-icon';
import { GasFeeTokenModal } from '../gas-fee-token-modal';
import styleSheet from './selected-gas-fee-token.styles';
import { useNativeCurrencySymbol } from '../../../hooks/useNativeCurrencySymbol';

export function SelectedGasFeeToken() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const {
    chainId: chainIdSingle,
    gasFeeTokens,
    excludeNativeTokenForFee,
  } = transactionMetadata || {};
  const { chainId: chainIdBatch } = transactionBatchesMetadata || {};
  const chainId = chainIdSingle ?? chainIdBatch;
  const hasGasFeeTokens = Boolean(gasFeeTokens?.length);

  const { styles } = useStyles(styleSheet, {
    hasGasFeeTokens,
  });

  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();

  const estimationFailed = useEstimationFailed();

  const hasInsufficientNative = useIsInsufficientBalance();

  const hasOnlyFutureNativeToken =
    gasFeeTokens?.length === 1 &&
    gasFeeTokens[0].tokenAddress === NATIVE_TOKEN_ADDRESS;

  const supportsFutureNative = hasInsufficientNative && isSmartTransaction;

  const supportsGasFeeTokens =
    !estimationFailed &&
    isGaslessSupported &&
    hasGasFeeTokens &&
    (!hasOnlyFutureNativeToken || supportsFutureNative);

  const nonNativeGasFeeTokensLength = useMemo(
    () =>
      (
        gasFeeTokens?.filter(
          (token) =>
            token.tokenAddress && token.tokenAddress !== NATIVE_TOKEN_ADDRESS,
        ) ?? []
      ).length,
    [gasFeeTokens],
  );
  // Disable fee token choice selection if only 1 token available.
  // Taking in account networks that don't have a native token.
  const hasMoreThanOneGasFeeTokenToChooseFrom = excludeNativeTokenForFee
    ? supportsGasFeeTokens && nonNativeGasFeeTokensLength > 1
    : supportsGasFeeTokens;

  const { nativeCurrencySymbol } = useNativeCurrencySymbol(chainId);

  const handlePress = useCallback(() => {
    if (!hasMoreThanOneGasFeeTokenToChooseFrom) {
      return;
    }

    setIsModalOpen(true);
  }, [hasMoreThanOneGasFeeTokenToChooseFrom]);

  const gasFeeToken = useSelectedGasFeeToken();
  const gasTokenSymbol = gasFeeToken?.symbol ?? nativeCurrencySymbol;

  return (
    <>
      {isModalOpen && (
        <GasFeeTokenModal onClose={() => setIsModalOpen(false)} />
      )}
      <TouchableOpacity
        onPress={handlePress}
        style={styles.gasFeeTokenButton}
        testID="selected-gas-fee-token"
        disabled={!hasMoreThanOneGasFeeTokenToChooseFrom}
      >
        <GasFeeTokenIcon
          tokenAddress={gasFeeToken?.tokenAddress ?? NATIVE_TOKEN_ADDRESS}
          size={GasFeeTokenIconSize.Sm}
        />
        <Text testID="selected-gas-fee-token-symbol">{gasTokenSymbol}</Text>
        {hasMoreThanOneGasFeeTokenToChooseFrom && (
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
