import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { strings } from '../../../../../locales/i18n';
import { getAssetTestId } from '../../../../../tests/selectors/Wallet/WalletView.selectors';
import { Theme } from '../../../../util/theme/models';
import { Box } from '../../Box/Box';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import { type BridgeToken } from '../types';
import { MoneyAvatar } from './MoneyAvatar';

const createStyles = ({
  theme,
  vars,
}: {
  theme: Theme;
  vars: { isSelected: boolean; hasBalance: boolean };
}) =>
  StyleSheet.create({
    listItem: {
      marginHorizontal: 16,
      paddingBottom: 8,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    container: {
      ...(vars.isSelected && {
        backgroundColor: theme.colors.primary.muted,
      }),
      position: 'relative',
      minHeight: 72,
      marginHorizontal: -16,
      paddingVertical: 4,
      paddingLeft: 16,
      paddingRight: 10,
    },
    selectedIndicator: {
      position: 'absolute',
      left: 4,
      top: 4,
      bottom: 4,
      width: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.primary.default,
    },
    itemWrapper: {
      flex: 1,
      paddingVertical: 12,
    },
    tokenInfo: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      marginLeft: 12,
      alignItems: vars.hasBalance ? AlignItems.flexStart : AlignItems.center,
    },
    nameColumn: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },
    childrenWrapper: {
      marginLeft: 12,
    },
  });

const TokenSelectorMoneyItemInner = ({
  token,
  onPress,
  isSelected = false,
  children,
}: {
  token: BridgeToken;
  onPress: (token: BridgeToken) => void;
  isSelected?: boolean;
  children?: React.ReactNode;
}) => {
  const moneyBalance = token.balanceFiat;
  const { styles } = useStyles(createStyles, {
    isSelected,
    hasBalance: Boolean(moneyBalance),
  });
  const handlePress = useCallback(() => {
    onPress(token);
  }, [onPress, token]);

  return (
    <View style={styles.listItem}>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        style={styles.container}
      >
        {isSelected ? (
          <View
            testID="money-token-selected-indicator"
            style={styles.selectedIndicator}
          />
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handlePress}
          style={styles.itemWrapper}
          testID={getAssetTestId(`${token.chainId}-${token.symbol}`)}
        >
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={4}
          >
            <MoneyAvatar
              size={Number(AvatarSize.Lg)}
              testID="money-token-icon"
            />
            <Box
              testID="money-token-text"
              flexDirection={FlexDirection.Row}
              style={styles.tokenInfo}
            >
              <View style={styles.nameColumn}>
                <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
                  {token.name}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  numberOfLines={1}
                >
                  {strings('bridge.stablecoin_account')}
                </Text>
              </View>
              <Box alignItems={AlignItems.flexEnd}>
                {moneyBalance ? (
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    numberOfLines={1}
                    testID="money-token-balance"
                  >
                    {moneyBalance}
                  </Text>
                ) : null}
                {token.apy !== undefined ? (
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Success}
                    numberOfLines={1}
                    testID="money-token-apy"
                  >
                    {strings('money.apy_label', { percentage: token.apy })}
                  </Text>
                ) : null}
              </Box>
            </Box>
          </Box>
        </TouchableOpacity>
        {children ? (
          <View style={styles.childrenWrapper}>{children}</View>
        ) : null}
      </Box>
    </View>
  );
};

export const TokenSelectorMoneyItem = React.memo(TokenSelectorMoneyItemInner);
