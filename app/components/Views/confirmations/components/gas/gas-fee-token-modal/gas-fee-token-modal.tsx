import React, { useCallback, useState } from 'react';
import { GasFeeToken } from '@metamask/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from '../../../hooks/gas/useIsGaslessSupported';
import { useIsInsufficientBalance } from '../../../hooks/useIsInsufficientBalance';
import { updateSelectedGasFeeToken } from '../../../../../../util/transaction-controller';
import BottomModal from '../../UI/bottom-modal';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import styleSheet from './gas-fee-token-modal.styles';
import Tooltip from '../../UI/Tooltip';
import { GasFeeTokenListItem } from '../gas-fee-token-list-item';
import { Hex } from '@metamask/utils';

export function GasFeeTokenModal({ onClose }: { onClose?: () => void }) {
  const transactionMeta = useTransactionMetadataRequest();
  const { isSmartTransaction } = useIsGaslessSupported();

  const hasInsufficientNative = useIsInsufficientBalance();

  const { styles } = useStyles(styleSheet, {});

  const {
    id: transactionId = '',
    gasFeeTokens,
    selectedGasFeeToken,
  } = transactionMeta || {};

  const hasFutureNativeToken =
    isSmartTransaction &&
    hasInsufficientNative &&
    Boolean(
      gasFeeTokens?.some(
        (token: GasFeeToken) => token.tokenAddress === NATIVE_TOKEN_ADDRESS,
      ),
    );

  const [futureNativeSelected, setFutureNativeSelected] = useState(
    hasFutureNativeToken && Boolean(selectedGasFeeToken),
  );

  const gasFeeTokenAddresses =
    gasFeeTokens
      ?.filter(
        (token: GasFeeToken) => token.tokenAddress !== NATIVE_TOKEN_ADDRESS,
      )
      .map((token: GasFeeToken) => token.tokenAddress) ?? [];

  const hasGasFeeTokens = gasFeeTokenAddresses.length > 0;

  const handleTokenClick = useCallback(
    async (token: GasFeeToken) => {
      const selectedAddress =
        token.tokenAddress === NATIVE_TOKEN_ADDRESS && !futureNativeSelected
          ? undefined
          : token.tokenAddress;

      updateSelectedGasFeeToken(transactionId, selectedAddress);

      onClose?.();
    },
    [futureNativeSelected, onClose, transactionId],
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
              size={ButtonIconSizes.Sm}
              testID="back-button"
            />
          </View>
          <Text variant={TextVariant.HeadingMD} style={styles.title}>
            {strings('gas_fee_token_modal.title')}
          </Text>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titlePayETH}>
            <Title
              text={strings('gas_fee_token_modal.title_pay_eth')}
              noMargin
            />
            {hasFutureNativeToken && (
              <NativeToggle
                isFuture={futureNativeSelected}
                onChange={setFutureNativeSelected}
              />
            )}
          </View>
          <GasFeeTokenListItem
            tokenAddress={
              futureNativeSelected ? NATIVE_TOKEN_ADDRESS : undefined
            }
            isSelected={
              !selectedGasFeeToken ||
              selectedGasFeeToken?.toLowerCase() === NATIVE_TOKEN_ADDRESS
            }
            onClick={handleTokenClick}
            warning={
              hasInsufficientNative &&
              !futureNativeSelected &&
              strings('gas_fee_token_modal.insufficient_balance')
            }
          />
          {hasGasFeeTokens && (
            <Title
              text={strings('gas_fee_token_modal.title_pay_with_other_tokens')}
            />
          )}
          {gasFeeTokenAddresses.map((tokenAddress: Hex) => (
            <GasFeeTokenListItem
              key={tokenAddress}
              tokenAddress={tokenAddress}
              isSelected={
                selectedGasFeeToken?.toLowerCase() ===
                tokenAddress.toLowerCase()
              }
              onClick={handleTokenClick}
            />
          ))}
        </View>
      </View>
    </BottomModal>
  );
}

function Title({ noMargin, text }: { noMargin?: boolean; text: string }) {
  const { styles } = useStyles(styleSheet, { noMargin });
  return (
    <Text
      variant={TextVariant.BodySM}
      color={TextColor.Alternative}
      style={styles.titleText}
    >
      {text}
    </Text>
  );
}

function NativeToggle({
  isFuture,
  onChange,
}: {
  isFuture?: boolean;
  onChange: (isFuture: boolean) => void;
}) {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View testID="native-toggle" style={styles.nativeToggleContainer}>
      <NativeToggleOption
        isSelected={!isFuture}
        onClick={() => {
          onChange(false);
        }}
        tooltip={strings('gas_fee_token_modal.native_toggle_wallet')}
      >
        <Icon
          name={IconName.Wallet}
          size={IconSize.Sm}
          color={isFuture ? IconColor.Alternative : IconColor.Default}
          style={styles.nativeToggleIcon}
        />
      </NativeToggleOption>
      <NativeToggleOption
        isSelected={isFuture}
        onClick={() => {
          onChange(true);
        }}
        tooltip={strings('gas_fee_token_modal.native_toggle_metamask')}
      >
        <img
          src="./images/logo/metamask-fox.svg"
          height={15}
          style={styles.nativeToggleIconImg}
        />
      </NativeToggleOption>
    </View>
  );
}

function NativeToggleOption({
  children,
  isSelected,
  onClick,
  tooltip,
}: {
  children: React.ReactNode;
  isSelected?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const { styles } = useStyles(styleSheet, { isSelected });
  return (
    <View
      style={
        isSelected
          ? styles.gasFeeTokenListItemSelected
          : styles.gasFeeTokenListItem
      }
    >
      {isSelected && (
        <View style={styles.gasFeeTokenListItemSelectedIndicator} />
      )}
      <Tooltip title={tooltip} onPress={onClick} content={children} />
    </View>
  );
}
