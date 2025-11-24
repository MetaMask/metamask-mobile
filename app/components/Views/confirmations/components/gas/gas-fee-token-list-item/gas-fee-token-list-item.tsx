import React from 'react';
import { GasFeeToken } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import { GasFeeTokenIcon, GasFeeTokenIconSize } from '../gas-fee-token-icon';
import { useGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { strings } from '../../../../../../../locales/i18n';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import styleSheet from './gas-fee-token-list-item.styles';
import { useStyles } from '../../../../../hooks/useStyles';

export interface GasFeeTokenListItemProps {
  isSelected?: boolean;
  onClick?: (token: GasFeeToken) => void;
  tokenAddress?: Hex;
  warning?: string;
}

export function GasFeeTokenListItem({
  isSelected,
  onClick,
  tokenAddress,
  warning,
}: GasFeeTokenListItemProps) {
  const gasFeeToken = useGasFeeToken({ tokenAddress });
  const currentCurrency = useSelector(selectCurrentCurrency);

  if (!gasFeeToken) {
    return null;
  }

  const { amountFiat, amountFormatted, balanceFiat, symbol } = gasFeeToken;

  return (
    <ListItem
      image={
        <GasFeeTokenIcon
          tokenAddress={tokenAddress ?? NATIVE_TOKEN_ADDRESS}
          size={GasFeeTokenIconSize.Md}
        />
      }
      isSelected={isSelected}
      leftPrimary={symbol}
      leftSecondary={`${strings(
        'gas_fee_token_modal.list_balance',
      )} ${balanceFiat} ${currentCurrency.toUpperCase()}`}
      rightPrimary={amountFiat}
      rightSecondary={`${amountFormatted} ${symbol}`}
      warning={warning && <WarningIndicator text={warning} />}
      onClick={() => onClick?.(gasFeeToken)}
    />
  );
}

function ListItem({
  image,
  leftPrimary,
  leftSecondary,
  rightPrimary,
  rightSecondary,
  isSelected,
  warning,
  onClick,
}: {
  image: React.ReactNode;
  leftPrimary: string;
  leftSecondary: string;
  rightPrimary?: string;
  rightSecondary: string;
  isSelected?: boolean;
  warning?: React.ReactNode;
  onClick?: () => void;
}) {
  const { styles } = useStyles(styleSheet, { isSelected });

  return (
    <TouchableOpacity
      testID={`gas-fee-token-list-item-${leftPrimary}`}
      onPress={() => onClick?.()}
      style={styles.gasFeeTokenListItem}
    >
      {isSelected && <SelectedIndicator />}
      <View style={styles.gasFeeTokenListItemContent}>
        {image}
        <View style={styles.gasFeeTokenListItemTextContainer}>
          <View style={styles.gasFeeTokenListItemSymbol}>
            <Text
              testID="gas-fee-token-list-item-symbol"
              variant={TextVariant.BodyMDMedium}
              style={styles.gasFeeTokenListItemSymbolText}
            >
              {leftPrimary}
            </Text>
            {warning}
          </View>
          <Text
            testID="gas-fee-token-list-item-balance"
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {leftSecondary}
          </Text>
        </View>
      </View>
      <View style={styles.gasFeeTokenListItemAmountContainer}>
        <Text
          testID="gas-fee-token-list-item-amount-fiat"
          variant={TextVariant.BodySMMedium}
        >
          {rightPrimary}
        </Text>
        <Text
          testID="gas-fee-token-list-item-amount-token"
          variant={TextVariant.BodySMMedium}
          color={TextColor.Alternative}
        >
          {rightSecondary}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function WarningIndicator({ text }: { text: string }) {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.warningIndicator}>
      <Icon
        name={IconName.Warning}
        size={IconSize.Xs}
        color={IconColor.Muted}
      />
      <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
        {text}
      </Text>
    </View>
  );
}

function SelectedIndicator() {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View
      testID="gas-fee-token-list-item-selected-indicator"
      style={styles.gasFeeTokenListItemSelectedIndicator}
    />
  );
}
