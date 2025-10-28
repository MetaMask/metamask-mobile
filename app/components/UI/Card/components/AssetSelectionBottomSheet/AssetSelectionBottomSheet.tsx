import React, { useCallback, useContext, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import {
  AllowanceState,
  CardExternalWalletDetail,
  CardTokenAllowance,
} from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsAuthenticatedCard,
  selectUserCardLocation,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
} from '../../../../../core/redux/slices/card';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { CaipChainId } from '@metamask/utils';
import useGetDelegationSettings from '../../hooks/useGetDelegationSettings';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { FlatList } from 'react-native-gesture-handler';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { SolScope } from '@metamask/keyring-api';
import useGetCardExternalWalletDetails from '../../hooks/useGetCardExternalWalletDetails';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import Logger from '../../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { SUPPORTED_ASSET_NETWORKS } from '../../constants';

export interface SupportedTokenWithChain {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
  caipChainId: CaipChainId;
  chainName: string;
  balance?: string;
  balanceFiat?: string;
  image?: string;
  logo?: string;
  allowanceState: AllowanceState;
  allowance?: string;
  delegationContract?: string;
}

export interface AssetSelectionBottomSheetProps {
  setOpenAssetSelectionBottomSheet: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
  priorityToken: CardTokenAllowance | null;
  tokensWithAllowances: CardTokenAllowance[];
  navigateToCardHomeOnPriorityToken?: boolean;
  // Selection only mode: just call onTokenSelect and close, don't handle priority/navigation
  selectionOnly?: boolean;
  onTokenSelect?: (token: SupportedTokenWithChain) => void;
}

const AssetSelectionBottomSheet: React.FC<AssetSelectionBottomSheetProps> = ({
  setOpenAssetSelectionBottomSheet,
  sheetRef,
  priorityToken,
  tokensWithAllowances,
  navigateToCardHomeOnPriorityToken = false,
  selectionOnly = false,
  onTokenSelect,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const userCardLocation = useSelector(selectUserCardLocation);
  const {
    data: delegationSettingsData,
    isLoading: isLoadingDelegationSettings,
  } = useGetDelegationSettings();
  const { data: cardExternalWalletDetails } = useGetCardExternalWalletDetails();

  // Map all available tokens from delegation settings and merge with user's current tokens
  const supportedTokens = useMemo<SupportedTokenWithChain[]>(() => {
    if (!delegationSettingsData?.networks || !sdk) return [];

    const allTokens: SupportedTokenWithChain[] = [];

    // Filter and iterate through supported networks only
    const filteredNetworks = delegationSettingsData.networks.filter(
      (network) => {
        const networkLower = network.network.toLowerCase();

        // Exclude Solana when in selection-only mode (used by SpendingLimit screen)
        if (selectionOnly && networkLower === 'solana') return false;

        // Only include supported networks
        if (!SUPPORTED_ASSET_NETWORKS.includes(networkLower)) return false;

        // Only show linea-us tokens for US users
        if (networkLower === 'linea-us' && userCardLocation !== 'us')
          return false;

        return true;
      },
    );

    filteredNetworks.forEach((network) => {
      const networkLower = network.network.toLowerCase();
      const isSolana = networkLower === 'solana';
      const caipChainId = isSolana
        ? SolScope.Mainnet
        : formatChainIdToCaip(network.chainId);
      const isStaging = network.environment === 'staging';

      // Iterate through all tokens in this network
      Object.entries(network.tokens).forEach(([_tokenKey, tokenConfig]) => {
        // For staging environment, map to real token for better UI
        let displayTokenAddress = tokenConfig.address;

        if (isStaging) {
          // Get the real token address from SDK's supported tokens
          const sdkSupportedTokens =
            sdk.getSupportedTokensByChainId(caipChainId);
          const realToken = sdkSupportedTokens.find(
            (t) => t.symbol?.toLowerCase() === tokenConfig.symbol.toLowerCase(),
          );

          if (realToken?.address) {
            displayTokenAddress = realToken.address;
          }
        }

        // Find if user already has this token
        // Match by: 1) address (for exact matches), or 2) symbol + chain (for Solana or staging)
        const userToken = tokensWithAllowances?.find((t) => {
          // Must match the same chain
          if (t.caipChainId !== caipChainId) {
            return false;
          }

          const userAddressLower = t.address?.toLowerCase();
          const tokenAddressLower = tokenConfig.address.toLowerCase();
          const displayAddressLower = displayTokenAddress.toLowerCase();
          const userSymbolLower = t.symbol?.toLowerCase();
          const tokenSymbolLower = tokenConfig.symbol.toLowerCase();

          // Try to match by address first (exact match)
          if (
            userAddressLower === tokenAddressLower ||
            userAddressLower === displayAddressLower
          ) {
            return true;
          }

          // Fallback: Match by symbol + chain (useful for Solana or when addresses differ)
          if (userSymbolLower === tokenSymbolLower) {
            return true;
          }

          return false;
        });

        const iconUrl = buildTokenIconUrl(
          caipChainId,
          displayTokenAddress || '',
        );

        const balance = userToken?.availableBalance
          ? parseFloat(userToken.availableBalance).toFixed(6)
          : '0';
        const balanceFiat = `$${parseFloat(balance).toFixed(2)} USD`;

        allTokens.push({
          address: displayTokenAddress,
          symbol: tokenConfig.symbol.toUpperCase(),
          name: tokenConfig.symbol.toUpperCase(),
          decimals: tokenConfig.decimals,
          enabled: userToken
            ? userToken.allowanceState !== AllowanceState.NotEnabled
            : false,
          caipChainId,
          chainName: isSolana ? 'Solana' : 'Linea',
          balance,
          balanceFiat,
          image: iconUrl,
          logo: iconUrl,
          allowanceState:
            userToken?.allowanceState || AllowanceState.NotEnabled,
          allowance: userToken?.allowance || '0',
          delegationContract: network.delegationContract,
        });
      });
    });

    // Sort: Priority token first, then enabled tokens, then disabled tokens
    return allTokens.sort((a, b) => {
      const aIsPriority =
        priorityToken &&
        a.address?.toLowerCase() === priorityToken.address?.toLowerCase() &&
        a.caipChainId === priorityToken.caipChainId;
      const bIsPriority =
        priorityToken &&
        b.address?.toLowerCase() === priorityToken.address?.toLowerCase() &&
        b.caipChainId === priorityToken.caipChainId;

      if (aIsPriority) return -1;
      if (bIsPriority) return 1;

      // Sort enabled tokens before disabled tokens
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;

      return 0;
    });
  }, [
    delegationSettingsData,
    tokensWithAllowances,
    priorityToken,
    sdk,
    userCardLocation,
    selectionOnly,
  ]);

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [sheetRef],
  );

  const showSuccessToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('card.asset_selection.update_success') }],
      iconName: IconName.Confirmation,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
      hasNoTimeout: false,
    });
  }, [toastRef, theme]);

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('card.asset_selection.update_error') }],
      iconName: IconName.Danger,
      iconColor: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
      hasNoTimeout: false,
    });
  }, [toastRef, theme]);

  const updatePriority = useCallback(
    async (token: SupportedTokenWithChain) => {
      if (
        !sdk ||
        !delegationSettingsData ||
        !cardExternalWalletDetails?.walletDetails
      ) {
        setOpenAssetSelectionBottomSheet(false);
        return;
      }

      try {
        const selectedWallet = cardExternalWalletDetails.walletDetails.find(
          (wallet) =>
            wallet.tokenDetails.address?.toLowerCase() ===
              token.address?.toLowerCase() &&
            wallet.caipChainId === token.caipChainId,
        );

        if (!selectedWallet) {
          showErrorToast();
          setOpenAssetSelectionBottomSheet(false);
          return;
        }

        // Create new priority order: selected token becomes priority 1, others shift down
        const newPriorities = cardExternalWalletDetails.walletDetails.map(
          (wallet: CardExternalWalletDetail, index: number) => ({
            id: wallet.id,
            priority: wallet.id === selectedWallet.id ? 1 : index + 2,
          }),
        );

        await sdk.updateWalletPriority(newPriorities);

        // Update priority token in Redux
        const priorityTokenData: CardTokenAllowance = {
          address: token.address,
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
          allowanceState: AllowanceState.Enabled,
          allowance: token.allowance || '0',
          availableBalance: token.balance || '0',
          walletAddress: selectedWallet.walletAddress,
          caipChainId: token.caipChainId,
          delegationContract: token.delegationContract,
        };

        dispatch(setAuthenticatedPriorityToken(priorityTokenData));
        dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));

        showSuccessToast();
        setOpenAssetSelectionBottomSheet(false);
      } catch (error) {
        Logger.error(
          error as Error,
          'AssetSelectionBottomSheet: Error updating wallet priority',
        );
        showErrorToast();
        setOpenAssetSelectionBottomSheet(false);
      }
    },
    [
      sdk,
      delegationSettingsData,
      cardExternalWalletDetails,
      dispatch,
      showSuccessToast,
      showErrorToast,
      setOpenAssetSelectionBottomSheet,
    ],
  );

  const isPriorityToken = useCallback(
    (token: SupportedTokenWithChain) =>
      priorityToken &&
      priorityToken.address?.toLowerCase() === token.address?.toLowerCase() &&
      priorityToken.caipChainId === token.caipChainId,
    [priorityToken],
  );

  const handleTokenPress = useCallback(
    async (token: SupportedTokenWithChain) => {
      // Selection only mode: just call the callback and close
      if (selectionOnly && onTokenSelect) {
        onTokenSelect(token);
        setOpenAssetSelectionBottomSheet(false);
        return;
      }

      // Regular mode: handle priority token logic
      // Check if this token is already the priority token
      const isAlreadyPriorityToken = isPriorityToken(token);

      if (isAlreadyPriorityToken) {
        // Token is already the priority token
        if (navigateToCardHomeOnPriorityToken) {
          // Navigate back to CardHome and close bottom sheet
          closeBottomSheetAndNavigate(() => {
            navigation.navigate(Routes.CARD.HOME);
          });
        } else {
          // Just close the bottom sheet
          setOpenAssetSelectionBottomSheet(false);
        }
      } else if (token.enabled && isAuthenticated) {
        // Token is already delegated, update priority directly
        await updatePriority(token);
      } else {
        // Token is not delegated
        // For Solana tokens, just close the bottom sheet (no spending limit support)
        const isSolanaToken =
          token.caipChainId === SolScope.Mainnet ||
          token.caipChainId.startsWith('solana:');

        if (isSolanaToken) {
          // Just close the bottom sheet for Solana tokens
          setOpenAssetSelectionBottomSheet(false);
        } else {
          // For EVM tokens, navigate to Spending Limit screen to enable it
          closeBottomSheetAndNavigate(() => {
            navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
              flow: 'enable',
              selectedToken: token,
            });
          });
        }
      }
    },
    [
      selectionOnly,
      onTokenSelect,
      isPriorityToken,
      isAuthenticated,
      navigateToCardHomeOnPriorityToken,
      closeBottomSheetAndNavigate,
      navigation,
      setOpenAssetSelectionBottomSheet,
      updatePriority,
    ],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={() => {
        setOpenAssetSelectionBottomSheet(false);
      }}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={() => setOpenAssetSelectionBottomSheet(false)}
      >
        <Text variant={TextVariant.HeadingSM}>
          {strings('card.select_asset')}
        </Text>
      </BottomSheetHeader>

      {isLoadingDelegationSettings ? (
        // Loading delegation settings
        <View style={tw.style('items-center justify-center py-8')}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </View>
      ) : supportedTokens.length > 0 ? (
        <FlatList
          scrollEnabled
          data={supportedTokens}
          renderItem={({ item }) => {
            const isCurrentPriority = isPriorityToken(item);
            return (
              <Box
                twClassName={
                  isCurrentPriority
                    ? 'border-l-4 border-primary-default bg-background-muted'
                    : ''
                }
              >
                <ListItemSelect onPress={() => handleTokenPress(item)}>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Between}
                    twClassName="flex-1"
                  >
                    {/* Token Info */}
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      twClassName="flex-1"
                    >
                      <BadgeWrapper
                        style={tw.style('mr-3')}
                        badgePosition={BadgePosition.BottomRight}
                        badgeElement={
                          item.caipChainId ? (
                            <Badge
                              variant={BadgeVariant.Network}
                              imageSource={NetworkBadgeSource(
                                safeFormatChainIdToHex(
                                  item.caipChainId,
                                ) as `0x${string}`,
                              )}
                            />
                          ) : null
                        }
                      >
                        <AvatarToken
                          size={AvatarSize.Md}
                          imageSource={{ uri: item.image || item.logo }}
                        />
                      </BadgeWrapper>
                      <Box
                        twClassName="flex-1"
                        justifyContent={BoxJustifyContent.Center}
                      >
                        <Text
                          variant={TextVariant.BodyMD}
                          style={tw.style('font-semibold')}
                        >
                          {item.symbol} on {item.chainName}
                        </Text>
                        <Text
                          variant={TextVariant.BodySM}
                          style={tw.style('font-medium text-text-alternative')}
                        >
                          {item.allowanceState === AllowanceState.Enabled
                            ? strings('card.asset_selection.enabled')
                            : item.allowanceState === AllowanceState.Limited
                            ? strings('card.asset_selection.limited')
                            : strings('card.asset_selection.not_enabled')}
                        </Text>
                      </Box>
                    </Box>

                    {/* Balance */}
                    <Box twClassName="items-end">
                      <Text
                        variant={TextVariant.BodySM}
                        style={tw.style('text-text-default font-medium')}
                      >
                        {item.balanceFiat}
                      </Text>
                      <Text
                        variant={TextVariant.BodyXS}
                        style={tw.style('text-text-alternative mt-1')}
                      >
                        {item.balance} {item.symbol}
                      </Text>
                    </Box>
                  </Box>
                </ListItemSelect>
              </Box>
            );
          }}
          keyExtractor={(item) =>
            `${item.address}-${item.symbol}-${safeFormatChainIdToHex(
              item.caipChainId,
            )}`
          }
        />
      ) : (
        <View style={tw.style('items-center justify-center py-8')}>
          <Text
            variant={TextVariant.BodySM}
            style={tw.style('text-center text-text-alternative')}
          >
            {strings('card.no_tokens_available')}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
};

export default AssetSelectionBottomSheet;
