import React, { useCallback } from 'react';
import { GasFeeToken } from '@metamask/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { updateSelectedGasFeeToken } from '../../../../../../util/transaction-controller';
import BottomModal from '../../UI/bottom-modal';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import styleSheet from './gas-fee-token-modal.styles';
import { GasFeeTokenListItem } from '../gas-fee-token-list-item';
import { Hex } from '@metamask/utils';

export function GasFeeTokenModal({ onClose }: { onClose?: () => void }) {
  const transactionMeta = useTransactionMetadataRequest();

  const { styles } = useStyles(styleSheet, {});

  const {
    id: transactionId = '',
    gasFeeTokens,
    selectedGasFeeToken,
  } = transactionMeta || {};

  const gasFeeTokenAddresses = [
    NATIVE_TOKEN_ADDRESS as Hex,
    ...(gasFeeTokens
      // Temporarily disable future ETH flow
      ?.filter((token) => token.tokenAddress !== NATIVE_TOKEN_ADDRESS)
      .map((token) => token.tokenAddress) ?? []),
  ];

  const handleTokenClick = useCallback(
    async (token: GasFeeToken) => {
      const selectedAddress =
        token.tokenAddress === NATIVE_TOKEN_ADDRESS
          ? undefined
          : token.tokenAddress;

      await updateSelectedGasFeeToken(transactionId, selectedAddress);

      onClose?.();
    },
    [onClose, transactionId],
  );

  return (
    <BottomModal
      testID="gas-fee-token-modal"
      onClose={
        onClose ??
        (() => {
          // Intentionally empty
        })
      }
    >
      <View style={styles.modalContainer}>
        <View style={styles.container}>
          <View style={styles.backButton}>
            <ButtonIcon
              iconName={IconName.ArrowLeft}
              onPress={onClose}
              testID="back-button"
            />
          </View>
          <Text variant={TextVariant.HeadingMD} style={styles.title}>
            {strings('gas_fee_token_modal.title')}
          </Text>
        </View>
        <View style={styles.contentContainer}>
          {gasFeeTokenAddresses.map((tokenAddress: Hex) => (
            <GasFeeTokenListItem
              key={tokenAddress}
              tokenAddress={tokenAddress}
              isSelected={
                selectedGasFeeToken?.toLowerCase() ===
                  tokenAddress.toLowerCase() ||
                (!selectedGasFeeToken && tokenAddress === NATIVE_TOKEN_ADDRESS)
              }
              onClick={handleTokenClick}
            />
          ))}
        </View>
      </View>
    </BottomModal>
  );
}
