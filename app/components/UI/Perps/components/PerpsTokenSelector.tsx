import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import TokenIcon from '../../Swaps/components/TokenIcon';

export interface PerpsToken {
  symbol: string;
  address: string;
  decimals: number;
  iconUrl?: string;
  balance?: string;
  balanceFiat?: number;
  name?: string;
  chainId?: string;
}

interface PerpsTokenSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onTokenSelect: (token: PerpsToken) => void;
  tokens: PerpsToken[];
  selectedTokenAddress?: string;
  title?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 24,
      height: 24,
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    tokenList: {
      paddingHorizontal: 24,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastTokenItem: {
      borderBottomWidth: 0,
    },
    tokenIcon: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenSymbol: {
      marginBottom: 2,
    },
    tokenName: {
      opacity: 0.7,
    },
    tokenBalance: {
      alignItems: 'flex-end',
    },
    selectedIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
  });

const PerpsTokenSelector: React.FC<PerpsTokenSelectorProps> = ({
  isVisible,
  onClose,
  onTokenSelect,
  tokens,
  selectedTokenAddress,
  title = 'Select Token',
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Filter to only show supported tokens for Perps deposits
  const supportedTokens = useMemo(() => {
    // Prioritize USDC as the primary deposit token, followed by other supported tokens
    const supportedSymbols = ['USDC', 'USDT', 'DAI', 'ETH', 'WETH'];
    return tokens.filter(token =>
      supportedSymbols.includes(token.symbol.toUpperCase())
    ).sort((a, b) => {
      // Prioritize USDC first
      if (a.symbol === 'USDC') return -1;
      if (b.symbol === 'USDC') return 1;
      return 0;
    });
  }, [tokens]);

  const handleTokenPress = useCallback((token: PerpsToken) => {
    onTokenSelect(token);
  }, [onTokenSelect]);

  const renderTokenItem = useCallback(({ item, index }: { item: PerpsToken; index: number }) => {
    const isSelected = item.address === selectedTokenAddress;
    const isLast = index === supportedTokens.length - 1;

    return (
      <TouchableOpacity
        style={[styles.tokenItem, isLast && styles.lastTokenItem]}
        onPress={() => handleTokenPress(item)}
        testID={`token-${item.symbol}`}
      >
        <View style={styles.tokenIcon}>
          <TokenIcon
            symbol={item.symbol}
            icon={item.iconUrl}
            medium
          />
        </View>

        <View style={styles.tokenInfo}>
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.tokenSymbol}
            testID={`token-symbol-${item.symbol}`}
          >
            {item.symbol}
          </Text>
          {item.name && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.tokenName}
              testID={`token-name-${item.symbol}`}
            >
              {item.name}
            </Text>
          )}
        </View>

        <View style={styles.tokenBalance}>
          {item.balance && (
            <Text
              variant={TextVariant.BodyMD}
              testID={`token-balance-${item.symbol}`}
            >
              {parseFloat(item.balance).toFixed(4)}
            </Text>
          )}
          {item.balanceFiat !== undefined && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              testID={`token-fiat-${item.symbol}`}
            >
              ${item.balanceFiat.toFixed(2)}
            </Text>
          )}
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <ButtonIcon
              iconName={IconName.Confirmation}
              iconColor={IconColor.Inverse}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedTokenAddress, supportedTokens.length, styles, handleTokenPress]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      testID="perps-token-selector-modal"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text
            variant={TextVariant.HeadingMD}
            style={styles.headerTitle}
            testID="token-selector-title"
          >
            {title}
          </Text>
          <ButtonIcon
            iconName={IconName.Close}
            onPress={onClose}
            iconColor={IconColor.Default}
            style={styles.closeButton}
            testID="close-token-selector"
          />
        </View>

        {/* Token List */}
        {supportedTokens.length > 0 ? (
          <FlatList
            data={supportedTokens}
            renderItem={renderTokenItem}
            keyExtractor={item => item.address}
            style={styles.tokenList}
            showsVerticalScrollIndicator={false}
            testID="token-list"
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              testID="no-tokens-message"
            >
              No supported tokens available
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default PerpsTokenSelector;
