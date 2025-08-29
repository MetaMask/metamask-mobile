import React, { useCallback, useMemo, useEffect } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  getDefaultNetworkByChainId,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import type { BridgeToken } from '../../../Bridge/types';
import { createStyles } from './PerpsTokenSelector.styles';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '../../constants/hyperLiquidConfig';
import { PerpsTokenSelectorSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { usePerpsPerformance } from '../../hooks';

// Re-export BridgeToken as PerpsToken for backward compatibility
export type PerpsToken = BridgeToken;

// Interface for network object returned by getDefaultNetworkByChainId
interface NetworkInfo {
  name: string;
  chainId: string;
  networkType: string;
  shortName?: string;
  ticker?: string;
  color?: string;
  imageSource?: unknown;
}

interface PerpsTokenSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onTokenSelect: (token: PerpsToken) => void;
  tokens: PerpsToken[];
  selectedTokenAddress?: string;
  selectedTokenChainId?: string;
  title?: string;
  minimumBalance?: number;
}

const PerpsTokenSelector: React.FC<PerpsTokenSelectorProps> = ({
  isVisible,
  onClose,
  onTokenSelect,
  tokens,
  selectedTokenAddress: _selectedTokenAddress,
  selectedTokenChainId: _selectedTokenChainId,
  title = 'Select asset to pay with',
  minimumBalance = 0,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { startMeasure, endMeasure } = usePerpsPerformance();

  // Track screen load time when modal opens
  useEffect(() => {
    if (isVisible) {
      startMeasure(PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED);
      // Use requestAnimationFrame to measure after the modal renders
      requestAnimationFrame(() => {
        endMeasure(PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED);
      });
    }
  }, [isVisible, startMeasure, endMeasure]);

  const isHyperliquidUsdc = useCallback(
    (token: PerpsToken) =>
      (token.chainId === HYPERLIQUID_MAINNET_CHAIN_ID ||
        token.chainId === HYPERLIQUID_TESTNET_CHAIN_ID) &&
      token.symbol === 'USDC',
    [],
  );

  const supportedTokens = useMemo(() => {
    const tokensWithBalances = tokens.filter((token) => {
      const tokenBalance = parseFloat(token.balance || '0');
      return tokenBalance >= minimumBalance;
    });

    return tokensWithBalances.sort((a, b) => {
      // Priority 1: USDC on Hyperliquid
      if (isHyperliquidUsdc(a)) return -1;
      if (isHyperliquidUsdc(b)) return 1;

      // Priority 2: Other USDC tokens
      if (a.symbol === 'USDC') return -1;
      if (b.symbol === 'USDC') return 1;

      // Priority 3: Sort by balance (highest first)
      const aBalance = parseFloat(a.balance || '0');
      const bBalance = parseFloat(b.balance || '0');
      return bBalance - aBalance;
    });
  }, [tokens, minimumBalance, isHyperliquidUsdc]);

  const handleTokenPress = useCallback(
    (token: PerpsToken) => {
      onTokenSelect(token);
    },
    [onTokenSelect],
  );

  const handleGetUSDC = useCallback(() => {
    onClose();
    // Navigate to Perps deposit flow
    navigation.navigate(Routes.PERPS.DEPOSIT);
  }, [navigation, onClose]);

  const renderTokenItem = useCallback(
    ({ item, index }: { item: PerpsToken; index: number }) => {
      const isLast = index === supportedTokens.length - 1;
      const isHyperliquid = isHyperliquidUsdc(item);
      const hasBalance = parseFloat(item.balance || '0') > 0;

      // Get network name
      const networkName = isHyperliquid
        ? 'Hyperliquid'
        : (() => {
            const network = getDefaultNetworkByChainId(String(item.chainId)) as
              | NetworkInfo
              | undefined;
            return network?.name || 'Unknown';
          })();

      return (
        <TouchableOpacity
          style={[styles.tokenItem, isLast && styles.lastTokenItem]}
          onPress={() => handleTokenPress(item)}
          testID={`token-${item.symbol}`}
        >
          <View style={styles.tokenIcon}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  imageSource={
                    isHyperliquid
                      ? getNetworkImageSource({
                          chainId: HYPERLIQUID_MAINNET_CHAIN_ID,
                        })
                      : getNetworkImageSource({ chainId: item.chainId })
                  }
                  name={networkName}
                  variant={BadgeVariant.Network}
                />
              }
            >
              <AvatarToken
                name={item.symbol}
                imageSource={item.image ? { uri: item.image } : undefined}
                size={AvatarSize.Md}
              />
            </BadgeWrapper>
          </View>

          <View style={styles.tokenInfo}>
            <View style={styles.tokenTitleRow}>
              <Text
                variant={TextVariant.BodyLGMedium}
                style={styles.tokenSymbol}
                testID={`token-symbol-${item.symbol}`}
              >
                {item.symbol}
                {isHyperliquid && ' • Hyperliquid'}
              </Text>
            </View>
          </View>

          <View style={styles.tokenBalance}>
            {isHyperliquid && !hasBalance ? (
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Sm}
                width={ButtonWidthTypes.Auto}
                label="Get USDC"
                onPress={handleGetUSDC}
                testID="get-usdc-button"
              />
            ) : (
              <>
                {item.balanceFiat && (
                  <Text
                    variant={TextVariant.BodyLGMedium}
                    style={styles.tokenBalanceAmount}
                    testID={`token-fiat-${item.symbol}`}
                  >
                    {item.balanceFiat}
                  </Text>
                )}
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    isHyperliquid ? TextColor.Success : TextColor.Alternative
                  }
                  style={styles.tokenTimingRight}
                >
                  {isHyperliquid ? 'Instant' : '~15 secs'}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [
      supportedTokens.length,
      styles,
      handleTokenPress,
      isHyperliquidUsdc,
      handleGetUSDC,
    ],
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      testID={PerpsTokenSelectorSelectorsIDs.MODAL}
    >
      <View
        style={styles.container}
        testID={PerpsTokenSelectorSelectorsIDs.CONTAINER}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text
            variant={TextVariant.HeadingMD}
            style={styles.headerTitle}
            testID={PerpsTokenSelectorSelectorsIDs.TITLE}
          >
            {title}
          </Text>
          <View style={styles.closeButton}>
            <ButtonIcon
              iconName={IconName.Close}
              onPress={onClose}
              iconColor={IconColor.Default}
              size={ButtonIconSizes.Sm}
              testID={PerpsTokenSelectorSelectorsIDs.CLOSE_BUTTON}
            />
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.infoText}
          >
            USDC on Hyperliquid will settle your perps the fastest, with the
            lowest fees. But you can pay with any token you have.
          </Text>
        </View>

        {/* Token List */}
        {supportedTokens.length > 0 ? (
          <FlatList
            data={supportedTokens}
            renderItem={renderTokenItem}
            keyExtractor={(item) => `${item.address}-${item.chainId}`}
            style={styles.tokenList}
            showsVerticalScrollIndicator={false}
            testID="token-list"
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant={TextVariant.BodyLGMedium}
              color={TextColor.Alternative}
              testID="no-tokens-message"
            >
              {strings('perps.token_selector.no_tokens')}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default PerpsTokenSelector;
