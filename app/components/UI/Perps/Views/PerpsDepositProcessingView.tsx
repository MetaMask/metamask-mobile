import {
  useNavigation,
  useRoute,
  type NavigationProp,
} from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import type { PerpsNavigationParamList } from '../controllers/types';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
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
import { usePerpsDeposit } from '../hooks';
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
import { ARBITRUM_MAINNET_CHAIN_ID } from '../constants/hyperLiquidConfig';
import { PerpsDepositProcessingViewSelectorsIDs } from '../../../../../e2e/selectors/Perps/Perps.selectors';

interface DepositProcessingParams {
  amount: string;
  selectedToken: string;
  txHash?: string;
  isDirectDeposit?: boolean; // true for USDC on Arbitrum, false for complex routes
}

interface DepositProcessingViewProps {}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    closeButton: {
      width: 24,
      height: 24,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    statusContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    statusIcon: {
      marginBottom: 24,
    },
    statusText: {
      textAlign: 'center',
      marginBottom: 16,
    },
    progressText: {
      textAlign: 'center',
      marginBottom: 32,
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    successDescription: {
      textAlign: 'center',
      marginBottom: 32,
    },
    errorContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    errorIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.error.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    actionButton: {
      width: '100%',
      marginTop: 'auto',
      marginBottom: 32,
    },
    retryButton: {
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

const PerpsDepositProcessingView: React.FC<DepositProcessingViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute();

  const {
    status: depositStatus,
    error: depositError,
    currentTxHash,
  } = usePerpsDeposit();

  const {
    amount,
    selectedToken,
    txHash,
    isDirectDeposit = false,
  } = (route.params as DepositProcessingParams) || {};

  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  const enhancedToken = useMemo(() => {
    if (!selectedToken) return null;

    const baseToken = {
      symbol: selectedToken,
      address: '', // Let the icon enhancement find the address from token list
      decimals: selectedToken === 'USDC' ? 6 : 18,
      name: selectedToken === 'USDC' ? 'USD Coin' : selectedToken,
      chainId: `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(
        16,
      )}` as Hex,
    };

    return enhanceTokenWithIcon({
      token: baseToken,
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [selectedToken, tokenList, isIpfsGatewayEnabled]);

  const actualTxHash = currentTxHash || txHash;

  useEffect(() => {
    if (depositStatus === 'success' && actualTxHash) {
      const timer = setTimeout(() => {
        navigation.navigate(Routes.PERPS.DEPOSIT_SUCCESS, {
          amount,
          selectedToken,
          txHash: actualTxHash,
        });
      }, 2000); // 2 second delay to show success state

      return () => clearTimeout(timer);
    }
  }, [depositStatus, actualTxHash, navigation, amount, selectedToken]);

  const handleClose = useCallback(() => {
    navigation.navigate(Routes.PERPS.TRADING_VIEW);
  }, [navigation]);

  const handleRetry = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewBalance = useCallback(() => {
    navigation.navigate(Routes.WALLET_VIEW);
  }, [navigation]);

  const getStatusContent = () => {
    switch (depositStatus) {
      case 'preparing':
        return {
          icon: (
            <ActivityIndicator
              size="large"
              color={colors.primary.default}
              testID={
                PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION
              }
            />
          ),
          title: strings('perps.deposit.steps.preparing'),
          description: strings('perps.deposit.step_descriptions.preparing'),
        };
      case 'swapping':
        return {
          icon: (
            <ActivityIndicator
              size="large"
              color={colors.primary.default}
              testID={
                PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION
              }
            />
          ),
          title: strings('perps.deposit.steps.swapping', {
            token: selectedToken || 'token',
          }),
          description: strings('perps.deposit.step_descriptions.swapping'),
        };
      case 'bridging':
        return {
          icon: (
            <ActivityIndicator
              size="large"
              color={colors.primary.default}
              testID={
                PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION
              }
            />
          ),
          title: strings('perps.deposit.steps.bridging'),
          description: strings('perps.deposit.step_descriptions.bridging'),
        };
      case 'depositing':
        return {
          icon: (
            <ActivityIndicator
              size="large"
              color={colors.primary.default}
              testID={
                PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION
              }
            />
          ),
          title: strings('perps.deposit.steps.depositing'),
          description: isDirectDeposit
            ? strings('perps.deposit.steps.depositing_direct')
            : strings('perps.deposit.step_descriptions.depositing'),
        };
      case 'success':
        return {
          icon: (
            <View style={styles.successIcon}>
              <ButtonIcon
                iconName={IconName.Confirmation}
                iconColor={IconColor.Inverse}
                testID={
                  PerpsDepositProcessingViewSelectorsIDs.SUCCESS_CHECKMARK
                }
              />
            </View>
          ),
          title: strings('perps.deposit.deposit_completed'),
          description: strings('perps.deposit.step_descriptions.success', {
            amount,
          }),
        };
      case 'error':
        return {
          icon: (
            <View style={styles.errorIcon}>
              <ButtonIcon
                iconName={IconName.Warning}
                iconColor={IconColor.Inverse}
                testID={PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ICON}
              />
            </View>
          ),
          title: strings('perps.deposit.deposit_failed'),
          description:
            depositError || strings('perps.deposit.step_descriptions.error'),
        };
      case 'idle':
      default:
        return {
          icon: (
            <ActivityIndicator
              size="large"
              color={colors.primary.default}
              testID={
                PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION
              }
            />
          ),
          title: isDirectDeposit
            ? strings('perps.deposit.steps.depositing')
            : strings('perps.deposit.steps.preparing'),
          description: strings('perps.deposit.step_descriptions.preparing'),
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text
          variant={TextVariant.HeadingMD}
          style={styles.headerTitle}
          testID={PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE}
        >
          {strings('perps.deposit.processing_title')}
        </Text>
        <ButtonIcon
          iconName={IconName.Close}
          onPress={handleClose}
          iconColor={IconColor.Default}
          style={styles.closeButton}
          testID={PerpsDepositProcessingViewSelectorsIDs.CLOSE_BUTTON}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.statusContainer}>
          <View style={styles.statusIcon}>{statusContent?.icon}</View>

          <Text
            variant={TextVariant.HeadingMD}
            style={styles.statusText}
            testID={PerpsDepositProcessingViewSelectorsIDs.STATUS_TITLE}
          >
            {statusContent?.title}
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
              <Text variant={TextVariant.BodyMD} style={styles.tokenText}>
                {amount} {selectedToken}
              </Text>
            </View>
          )}

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.progressText}
            testID="status-description"
          >
            {statusContent?.description}
          </Text>
        </View>

        <View style={styles.actionButton}>
          {depositStatus === 'success' && (
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.deposit.view_balance')}
              onPress={handleViewBalance}
              testID="view-balance-button"
            />
          )}

          {depositStatus === 'error' && (
            <>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.deposit.retry_deposit')}
                onPress={handleRetry}
                style={styles.retryButton}
                testID="retry-button"
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.deposit.go_back')}
                onPress={handleClose}
                testID="go-back-button"
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsDepositProcessingView;
