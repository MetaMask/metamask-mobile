import {
  useNavigation,
  useRoute,
  type NavigationProp,
} from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import type { PerpsNavigationParamList } from '../controllers/types';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import Routes from '../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import {
  getNetworkImageSource,
  BLOCKAID_SUPPORTED_NETWORK_NAMES,
} from '../../../../util/networks';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  TOKEN_DECIMALS,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
} from '../constants/hyperLiquidConfig';
import { toHex } from '@metamask/controller-utils';

interface DepositSuccessParams {
  amount: string;
  selectedToken: string;
  txHash?: string;
  processingTime?: number;
}

interface PerpsDepositSuccessViewProps {}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    successAmount: {
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 16,
    },
    successDescription: {
      textAlign: 'center',
      marginBottom: 32,
    },
    infoContainer: {
      backgroundColor: colors.background.alternative,
      padding: 16,
      borderRadius: 8,
      width: '100%',
      marginBottom: 32,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoLabel: {
      flex: 1,
    },
    infoValue: {
      flex: 1,
      textAlign: 'right',
    },
    actionContainer: {
      width: '100%',
      marginTop: 'auto',
      paddingBottom: 32,
    },
    primaryButton: {
      marginBottom: 16,
    },
    tokenDisplayContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    tokenText: {
      marginLeft: 8,
    },
  });

const PerpsDepositSuccessView: React.FC<PerpsDepositSuccessViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute();

  const params = route.params as DepositSuccessParams;
  const { amount, selectedToken, txHash, processingTime } = params || {};

  // Get token list for icon enhancement
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  // Create enhanced token object with proper icon
  const enhancedToken = useMemo(() => {
    if (!selectedToken) return null;

    // Create base token object (fallback to USDC on Arbitrum)
    const baseToken = {
      symbol: selectedToken,
      address: '', // Let the icon enhancement find the address from token list
      decimals: selectedToken === USDC_SYMBOL ? USDC_DECIMALS : TOKEN_DECIMALS,
      name: selectedToken === USDC_SYMBOL ? USDC_NAME : selectedToken,
      chainId: toHex(ARBITRUM_MAINNET_CHAIN_ID) as Hex,
    };

    return enhanceTokenWithIcon({
      token: baseToken,
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [selectedToken, tokenList, isIpfsGatewayEnabled]);

  const handleViewBalance = useCallback(() => {
    navigation.navigate(Routes.WALLET_VIEW);
  }, [navigation]);

  const handleViewTransaction = useCallback(() => {
    // TODO: Open blockchain explorer
  }, []);

  const formatProcessingTime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon and Text */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon
              name={IconName.Check}
              size={IconSize.Xl}
              color={IconColor.Inverse}
            />
          </View>

          <Text variant={TextVariant.HeadingLG} style={styles.successTitle}>
            {strings('perps.deposit.success.title')}
          </Text>

          {enhancedToken && (
            <View style={styles.tokenDisplayContainer}>
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <BadgeNetwork
                    name={
                      getNetworkImageSource({ chainId: enhancedToken.chainId })
                        ? BLOCKAID_SUPPORTED_NETWORK_NAMES[
                            enhancedToken.chainId as keyof typeof BLOCKAID_SUPPORTED_NETWORK_NAMES
                          ] || enhancedToken.chainId
                        : enhancedToken.chainId
                    }
                    imageSource={getNetworkImageSource({
                      chainId: enhancedToken.chainId,
                    })}
                  />
                }
              >
                <AvatarToken
                  size={AvatarSize.Md}
                  name={enhancedToken.name || enhancedToken.symbol}
                  imageSource={
                    enhancedToken.image
                      ? { uri: enhancedToken.image }
                      : undefined
                  }
                />
              </BadgeWrapper>
              <Text style={[styles.successAmount, styles.tokenText]}>
                {amount} {selectedToken}
              </Text>
            </View>
          )}

          {!enhancedToken && (
            <Text style={styles.successAmount}>
              {amount} {selectedToken}
            </Text>
          )}

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.successDescription}
          >
            {strings('perps.deposit.success.description')}
          </Text>
        </View>

        {/* Transaction Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.infoLabel}
            >
              {strings('perps.deposit.success.amount')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.infoValue}>
              {amount} {selectedToken}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.infoLabel}
            >
              {strings('perps.deposit.success.processing_time')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.infoValue}>
              {formatProcessingTime(processingTime)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.infoLabel}
            >
              {strings('perps.deposit.success.status')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Success}
              style={styles.infoValue}
            >
              {strings('perps.deposit.success.completed')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.deposit.success.view_balance')}
            onPress={handleViewBalance}
            style={styles.primaryButton}
            testID="view-balance-button"
          />

          {txHash && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.deposit.success.view_transaction')}
              onPress={handleViewTransaction}
              testID="view-transaction-button"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsDepositSuccessView;
