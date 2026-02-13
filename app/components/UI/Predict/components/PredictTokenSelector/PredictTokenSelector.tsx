import { Hex } from '@metamask/utils';
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  PREDICT_BALANCE_CHAIN_ID,
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
} from '../../constants/transactions';
import { PaymentToken } from '../../hooks/usePredictPaymentToken';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import BaseTokenIcon from '../../../../Base/TokenIcon';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';

const tokenIconStyles = StyleSheet.create({
  iconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

const createStyles = (colors: { background: { section: string } }) =>
  StyleSheet.create({
    payRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    payRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
  });

interface PredictTokenSelectorProps {
  selectedToken: PaymentToken;
  onPress: () => void;
  disabled?: boolean;
}

const PredictTokenSelector = ({
  selectedToken,
  onPress,
  disabled = false,
}: PredictTokenSelectorProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isPredictBalance = selectedToken.isPredictBalance;

  const token = useTokenWithBalance(
    (isPredictBalance
      ? PREDICT_BALANCE_PLACEHOLDER_ADDRESS
      : selectedToken.address) as Hex,
    (isPredictBalance
      ? PREDICT_BALANCE_CHAIN_ID
      : selectedToken.chainId) as Hex,
  );

  const networkImageSource = useMemo(
    () =>
      isPredictBalance
        ? undefined
        : getNetworkImageSource({
            chainId: selectedToken.chainId as Hex,
          }),
    [isPredictBalance, selectedToken.chainId],
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={styles.payRow}
      testID="predict-pay-row"
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        style={styles.payRowLeft}
      >
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('predict.order.pay_with')}
        </Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        {isPredictBalance ? (
          <>
            <Icon
              name={IconName.Wallet}
              size={IconSize.Md}
              color={IconColor.Primary}
            />
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              testID="predict-pay-row-symbol"
            >
              {selectedToken.name}
            </Text>
          </>
        ) : (
          <>
            {token && networkImageSource ? (
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={networkImageSource}
                  />
                }
              >
                <BaseTokenIcon
                  testID="predict-pay-row-token-icon"
                  icon={token.image}
                  symbol={token.symbol}
                  style={tokenIconStyles.iconSmall}
                />
              </BadgeWrapper>
            ) : (
              <BaseTokenIcon
                testID="predict-pay-row-token-icon"
                icon={selectedToken.iconUrl}
                symbol={selectedToken.symbol}
                style={tokenIconStyles.iconSmall}
              />
            )}
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              testID="predict-pay-row-symbol"
            >
              {token?.symbol ?? selectedToken.symbol}
            </Text>
          </>
        )}
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          color={IconColor.Alternative}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default PredictTokenSelector;
