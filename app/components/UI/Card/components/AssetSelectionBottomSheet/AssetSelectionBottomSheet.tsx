import React, { useCallback, useContext, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import {
  AllowanceState,
  CardExternalWalletDetailsResponse,
  CardTokenAllowance,
  DelegationSettingsResponse,
} from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsAuthenticatedCard,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  clearCacheData,
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
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
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
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { FlatList } from 'react-native-gesture-handler';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { SolScope } from '@metamask/keyring-api';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { SUPPORTED_ASSET_NETWORKS } from '../../constants';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions } from '../../util/metrics';
import { truncateAddress } from '../../util/truncateAddress';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import Logger from '../../../../../util/Logger';
import { useAssetBalances } from '../../hooks/useAssetBalances';

export interface SupportedTokenWithChain {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
  caipChainId: CaipChainId;
  chainName: string;
  walletAddress?: string; // The user's wallet address holding this token
  balance?: string;
  balanceFiat?: string;
  image?: string;
  logo?: string;
  allowanceState: AllowanceState;
  allowance?: string;
  delegationContract?: string;
  priority?: number; // Lower number = higher priority (1 is highest)
  availableBalance?: string; // Available balance from API for enabled tokens
  stagingTokenAddress?: string;
}

export interface AssetSelectionBottomSheetProps {
  setOpenAssetSelectionBottomSheet: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
  tokensWithAllowances: CardTokenAllowance[];
  delegationSettings: DelegationSettingsResponse | null;
  cardExternalWalletDetails?:
    | {
        walletDetails: never[];
        mappedWalletDetails: never[];
        priorityWalletDetail: null;
      }
    | {
        walletDetails: CardExternalWalletDetailsResponse;
        mappedWalletDetails: CardTokenAllowance[];
        priorityWalletDetail: CardTokenAllowance | undefined;
      }
    | null;
  navigateToCardHomeOnPriorityToken?: boolean;
  // Selection only mode: just call onTokenSelect and close, don't handle priority/navigation
  selectionOnly?: boolean;
  onTokenSelect?: (token: SupportedTokenWithChain) => void;
  // Hide Solana assets completely (used in SpendingLimit since Solana delegation is not supported)
  hideSolanaAssets?: boolean;
}

const AssetSelectionBottomSheet: React.FC<AssetSelectionBottomSheetProps> = ({
  setOpenAssetSelectionBottomSheet,
  sheetRef,
  tokensWithAllowances,
  delegationSettings,
  cardExternalWalletDetails,
  navigateToCardHomeOnPriorityToken = false,
  selectionOnly = false,
  onTokenSelect,
  hideSolanaAssets = false,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigateToCardPage } = useNavigateToCardPage(navigation);

  // Get supported tokens from the card SDK to display in the bottom sheet.
  const cardSupportedTokens = useMemo(
    () => sdk?.getSupportedTokensByChainId(sdk?.lineaChainId) ?? [],
    [sdk],
  );

  // Helper function to check if two chain IDs represent the same Solana chain
  const isSameSolanaChain = useCallback(
    (chainId1: CaipChainId, chainId2: CaipChainId): boolean => {
      const isSolana1 =
        chainId1 === SolScope.Mainnet || chainId1?.startsWith('solana:');
      const isSolana2 =
        chainId2 === SolScope.Mainnet || chainId2?.startsWith('solana:');
      return isSolana1 && isSolana2;
    },
    [],
  );

  // Helper function to check if two chain IDs represent the same Linea chain
  // This handles both 'linea' and 'linea-us' which may have the same or different chain IDs
  const isSameLineaChain = useCallback(
    (chainId1: CaipChainId, chainId2: CaipChainId): boolean => {
      // Extract the numeric chain ID from CAIP format (e.g., "eip155:59144" -> "59144")
      const getNumericChainId = (caipChainId: CaipChainId): string | null => {
        if (caipChainId?.startsWith('eip155:')) {
          return caipChainId.split(':')[1];
        }
        return null;
      };

      const chainNum1 = getNumericChainId(chainId1);
      const chainNum2 = getNumericChainId(chainId2);

      // If both are Linea chain IDs (59144 for mainnet, 59141 for Sepolia, 59140 for Goerli)
      const lineaChainIds = ['59144', '59141', '59140'];
      const isLinea1 = chainNum1 && lineaChainIds.includes(chainNum1);
      const isLinea2 = chainNum2 && lineaChainIds.includes(chainNum2);

      // If both are Linea chains and have the same chain ID, they're the same
      return Boolean(isLinea1 && isLinea2 && chainNum1 === chainNum2);
    },
    [],
  );

  // Map user's actual wallets/tokens to display format + add supported tokens from delegation settings
  // This preserves duplicates (same token on same chain but different wallet addresses)
  const supportedTokens = useMemo<SupportedTokenWithChain[]>(() => {
    if (!sdk) return [];

    // Start with user's actual wallet tokens (if any)
    const userTokens: SupportedTokenWithChain[] = (tokensWithAllowances || [])
      .map((userToken) => {
        // Determine chain name based on CAIP chain ID - only allow supported chains
        const isSolana =
          userToken.caipChainId === SolScope.Mainnet ||
          userToken.caipChainId?.startsWith('solana:');

        let chainName = 'Unknown'; // Default to Unknown for unsupported chains
        if (isSolana) {
          chainName = 'Solana';
        } else if (
          userToken.caipChainId?.includes(':59144') || // Linea Mainnet
          userToken.caipChainId?.includes(':59141') || // Linea Sepolia
          userToken.caipChainId?.includes(':59140') // Linea Goerli
        ) {
          chainName = 'Linea';
        }
        // Do not default other EIP155 chains to anything - they stay "Unknown" and get filtered out

        // Build token icon URL
        const iconUrl = buildTokenIconUrl(
          userToken.caipChainId,
          userToken.address || '',
        );

        // Preserve original availableBalance for the hook to use
        return {
          address: userToken.address ?? '',
          symbol: userToken.symbol?.toUpperCase() ?? '',
          name: userToken.name ?? userToken.symbol?.toUpperCase() ?? '',
          decimals: userToken.decimals ?? 0,
          enabled: userToken.allowanceState !== AllowanceState.NotEnabled,
          caipChainId: userToken.caipChainId,
          chainName,
          walletAddress: userToken.walletAddress,
          balance: '0', // Will be updated from hook
          balanceFiat: '$0.00', // Will be updated from hook
          image: iconUrl,
          logo: iconUrl,
          allowanceState: userToken.allowanceState,
          allowance: userToken.allowance || '0',
          delegationContract: userToken.delegationContract ?? undefined,
          priority: userToken.priority, // Preserve priority from API
          availableBalance: userToken.availableBalance, // Preserve for hook
          stagingTokenAddress: userToken.stagingTokenAddress ?? undefined, // Preserve staging address for delegation/allowance
        };
      })
      .filter((token) => {
        // Filter out unsupported networks and unknown chains
        const networkLower = token.chainName.toLowerCase();
        if (
          !SUPPORTED_ASSET_NETWORKS.includes(networkLower) ||
          networkLower === 'unknown'
        ) {
          return false;
        }

        const isSolana =
          token.caipChainId === SolScope.Mainnet ||
          token.caipChainId?.startsWith('solana:');

        // Hide all Solana assets if hideSolanaAssets prop is true
        if (hideSolanaAssets && isSolana) {
          return false;
        }

        // Don't filter out Solana tokens by enabled state here - we want to show all
        // delegation settings tokens so users can enable them

        return true;
      });

    // Add supported tokens from delegation settings that user doesn't have in wallet
    const supportedFromSettings: SupportedTokenWithChain[] = [];

    if (delegationSettings?.networks) {
      for (const network of delegationSettings.networks) {
        // Only process supported networks
        const networkLower = network.network?.toLowerCase();
        if (!networkLower || !SUPPORTED_ASSET_NETWORKS.includes(networkLower)) {
          continue;
        }

        // Skip if hiding Solana assets
        const isSolana = network.network === 'solana';
        if (hideSolanaAssets && isSolana) {
          continue;
        }

        // Map network to display name
        let chainName: string;
        if (network.network === 'solana') {
          chainName = 'Solana';
        } else if (
          network.network === 'linea' ||
          network.network === 'linea-us'
        ) {
          chainName = 'Linea';
        } else {
          // Unsupported network, skip
          continue;
        }

        // Map chain ID to CAIP format
        let caipChainId: CaipChainId;
        if (network.network === 'solana') {
          caipChainId = SolScope.Mainnet;
        } else {
          // For EVM chains (linea, linea-us), ensure we always create a proper CAIP chain ID
          const chainIdStr = network.chainId;
          let numericChainId: number;

          if (chainIdStr.startsWith('0x')) {
            // Hex format: convert to decimal
            numericChainId = parseInt(chainIdStr, 16);
          } else {
            // Already decimal format
            numericChainId = parseInt(chainIdStr, 10);
          }

          // Filter out testnet chains to avoid showing duplicate-looking tokens
          // 59144 = Linea Mainnet (keep)
          // 59141 = Linea Sepolia (skip)
          // 59140 = Linea Goerli (skip)
          const testnetChainIds = [59141, 59140];
          if (testnetChainIds.includes(numericChainId)) {
            continue;
          }

          caipChainId = `eip155:${numericChainId}` as CaipChainId;
        }

        for (const [, tokenConfig] of Object.entries(network.tokens)) {
          // Skip tokens without an address
          if (!tokenConfig.address) {
            continue;
          }

          const tokenAddressLower = tokenConfig.address.toLowerCase();

          // Check if this token is already in user's wallet tokens
          // Use special comparison for Solana and Linea to handle different chain ID formats
          const existsInUserTokens = userTokens.some((userToken) => {
            if (!userToken.address) return false;
            const addressMatch =
              userToken.address.toLowerCase() === tokenAddressLower;

            // Determine chain match based on network type
            let chainMatch: boolean;
            if (isSolana) {
              chainMatch = isSameSolanaChain(
                userToken.caipChainId,
                caipChainId,
              );
            } else {
              // For Linea, use special comparison to handle 'linea' and 'linea-us'
              chainMatch = isSameLineaChain(userToken.caipChainId, caipChainId);
            }

            return addressMatch && chainMatch;
          });

          // Also check if user already has a token with the same symbol on the same chain
          // (to avoid showing different contract addresses with same symbol, which confuses UX)
          const userHasSameSymbolOnChain = userTokens.some((userToken) => {
            const symbolMatch =
              userToken.symbol?.toUpperCase() ===
              tokenConfig.symbol?.toUpperCase();

            // Determine chain match based on network type
            let chainMatch: boolean;
            if (isSolana) {
              chainMatch = isSameSolanaChain(
                userToken.caipChainId,
                caipChainId,
              );
            } else {
              // For Linea, use special comparison to handle 'linea' and 'linea-us'
              chainMatch = isSameLineaChain(userToken.caipChainId, caipChainId);
            }

            return symbolMatch && chainMatch;
          });

          // Also check if we've already added this token from delegation settings
          // (to avoid duplicates from multiple network configs like 'linea' and 'linea-us')
          const existsInSettings = supportedFromSettings.some(
            (settingsToken) => {
              if (!settingsToken.address) return false;
              const addressMatch =
                settingsToken.address.toLowerCase() === tokenAddressLower;

              // Determine chain match based on network type
              let chainMatch: boolean;
              if (isSolana) {
                chainMatch = isSameSolanaChain(
                  settingsToken.caipChainId,
                  caipChainId,
                );
              } else {
                // For Linea, use special comparison to handle 'linea' and 'linea-us'
                chainMatch = isSameLineaChain(
                  settingsToken.caipChainId,
                  caipChainId,
                );
              }

              return addressMatch && chainMatch;
            },
          );

          // Skip if:
          // 1. User already has this exact token (same address + chain)
          // 2. Token already exists in settings from previous network config
          // 3. User already has a token with same symbol on same chain (avoid showing multiple USDC contracts)
          // 4. For Solana tokens from delegation settings: don't show them (Solana delegation not supported)
          //    Users can only see/enable Solana tokens they already have in their wallet
          if (
            existsInUserTokens ||
            existsInSettings ||
            userHasSameSymbolOnChain ||
            isSolana
          ) {
            continue;
          }

          // If the token is on development or staging, use the card supported token address.
          // That's necessary because the token address is different in the staging/development environment.
          const isNonProductionEnvironment =
            network.environment !== 'production';
          const cardSupportedToken = cardSupportedTokens.find(
            (token) =>
              tokenConfig.symbol.toUpperCase() === token.symbol?.toUpperCase(),
          );
          const tokenAddress =
            isNonProductionEnvironment && cardSupportedToken?.address
              ? cardSupportedToken?.address
              : tokenConfig.address;

          const iconUrl = buildTokenIconUrl(caipChainId, tokenAddress);

          supportedFromSettings.push({
            address: tokenAddress,
            symbol: tokenConfig.symbol.toUpperCase(),
            name: tokenConfig.symbol.toUpperCase(),
            decimals: tokenConfig.decimals,
            enabled: false, // Not enabled since user doesn't have it
            caipChainId,
            chainName,
            walletAddress: undefined, // No wallet address since user doesn't have this token
            balance: '0',
            balanceFiat: '$0.00 USD',
            image: iconUrl,
            logo: iconUrl,
            allowanceState: AllowanceState.NotEnabled,
            allowance: '0',
            delegationContract: network.delegationContract,
            priority: undefined, // No priority for unsupported tokens
            stagingTokenAddress: isNonProductionEnvironment
              ? tokenConfig.address
              : undefined,
          });
        }
      }
    }

    // Combine user tokens and supported tokens from settings
    const allTokens = [...userTokens, ...supportedFromSettings];

    // Sort tokens based on priority values from API
    return allTokens.sort((a, b) => {
      // If both tokens have priority values (authenticated mode), sort by priority
      // Lower number = higher priority (1 is highest)
      if (
        a.priority !== undefined &&
        a.priority !== null &&
        b.priority !== undefined &&
        b.priority !== null
      ) {
        return a.priority - b.priority;
      }

      // If only one has priority, that one comes first
      if (a.priority !== undefined && a.priority !== null) return -1;
      if (b.priority !== undefined && b.priority !== null) return 1;

      // If neither has priority (unauthenticated mode), check if either matches priorityToken
      const aIsPriority =
        cardExternalWalletDetails?.priorityWalletDetail &&
        a.address?.toLowerCase() ===
          cardExternalWalletDetails.priorityWalletDetail.address?.toLowerCase() &&
        a.caipChainId ===
          cardExternalWalletDetails.priorityWalletDetail.caipChainId &&
        a.walletAddress?.toLowerCase() ===
          cardExternalWalletDetails.priorityWalletDetail.walletAddress?.toLowerCase();
      const bIsPriority =
        cardExternalWalletDetails?.priorityWalletDetail &&
        b.address?.toLowerCase() ===
          cardExternalWalletDetails.priorityWalletDetail.address?.toLowerCase() &&
        b.caipChainId ===
          cardExternalWalletDetails.priorityWalletDetail.caipChainId &&
        b.walletAddress?.toLowerCase() ===
          cardExternalWalletDetails.priorityWalletDetail.walletAddress?.toLowerCase();

      if (aIsPriority) return -1;
      if (bIsPriority) return 1;

      // Sort enabled tokens before disabled tokens
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;

      return 0;
    });
  }, [
    tokensWithAllowances,
    cardExternalWalletDetails,
    sdk,
    hideSolanaAssets,
    delegationSettings,
    isSameSolanaChain,
    isSameLineaChain,
    cardSupportedTokens,
  ]);

  // Get balances for all tokens (including those from delegation settings)
  const assetBalances = useAssetBalances(supportedTokens);

  // Merge balance data into supportedTokens
  const supportedTokensWithBalances = useMemo(
    () =>
      supportedTokens.map((token) => {
        const tokenKey = `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;
        const balanceInfo = assetBalances.get(tokenKey);

        if (balanceInfo) {
          return {
            ...token,
            balance: balanceInfo.rawTokenBalance?.toFixed(6) || '0',
            balanceFiat: balanceInfo.balanceFiat || '$0.00',
          };
        }

        return token;
      }),
    [supportedTokens, assetBalances],
  );

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
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.ASSET_ITEM_SELECT_TOKEN_BOTTOMSHEET,
            bottomsheet_selected_token_symbol: token.symbol,
            bottomsheet_selected_token_chain_id: token.caipChainId,
            bottomsheet_selected_token_limit_amount: isNaN(
              Number(token.allowance),
            )
              ? 0
              : Number(token.allowance),
          })
          .build(),
      );
      if (
        !sdk ||
        !delegationSettings ||
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
            wallet.caipChainId === token.caipChainId &&
            wallet.walletAddress?.toLowerCase() ===
              token.walletAddress?.toLowerCase(),
        );

        if (!selectedWallet) {
          showErrorToast();
          setOpenAssetSelectionBottomSheet(false);
          return;
        }

        // First, sort by current priority to maintain order
        const sortedWallets = [...cardExternalWalletDetails.walletDetails].sort(
          (a, b) => a.priority - b.priority,
        );

        // Build new priorities: selected gets 1, others shift down maintaining their order
        let nextPriority = 2;
        const newPriorities = sortedWallets.map((wallet) => {
          const isSelected =
            wallet.id === selectedWallet.id &&
            wallet.walletAddress?.toLowerCase() ===
              selectedWallet.walletAddress?.toLowerCase();

          const priority = isSelected ? 1 : nextPriority++;

          return {
            id: wallet.id,
            priority,
          };
        });

        await sdk.updateWalletPriority(newPriorities);

        // Invalidate external wallet details cache to force refetch with updated priorities
        dispatch(clearCacheData('card-external-wallet-details'));

        // Update priority token in Redux with new priority value
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
          priority: 1, // New priority is always 1 (highest)
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
      delegationSettings,
      cardExternalWalletDetails,
      dispatch,
      showSuccessToast,
      showErrorToast,
      setOpenAssetSelectionBottomSheet,
      trackEvent,
      createEventBuilder,
    ],
  );

  const isPriorityToken = useCallback(
    (token: SupportedTokenWithChain) =>
      cardExternalWalletDetails?.priorityWalletDetail &&
      cardExternalWalletDetails.priorityWalletDetail.address?.toLowerCase() ===
        token.address?.toLowerCase() &&
      cardExternalWalletDetails.priorityWalletDetail.caipChainId ===
        token.caipChainId &&
      cardExternalWalletDetails.priorityWalletDetail.walletAddress?.toLowerCase() ===
        token.walletAddress?.toLowerCase(),
    [cardExternalWalletDetails],
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
        // Token is not delegated, navigate to Spending Limit screen to enable it
        // Use 'manage' flow to maintain "Change token and network" context
        closeBottomSheetAndNavigate(() => {
          navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
            flow: 'manage',
            selectedToken: token,
          });
        });
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

      {!delegationSettings ? (
        // Loading delegation settings
        <View style={tw.style('items-center justify-center py-8')}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </View>
      ) : supportedTokensWithBalances.length > 0 ? (
        <FlatList
          scrollEnabled
          data={supportedTokensWithBalances}
          ListFooterComponent={
            hideSolanaAssets ? (
              <ListItemSelect onPress={navigateToCardPage}>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName="flex-1"
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="flex-1"
                  >
                    <AvatarToken
                      size={AvatarSize.Md}
                      // eslint-disable-next-line @typescript-eslint/no-require-imports
                      imageSource={require('../../../../../images/solana-logo.png')}
                    />
                    <Box
                      twClassName="flex-1 ml-3"
                      justifyContent={BoxJustifyContent.Center}
                    >
                      <Text
                        variant={TextVariant.BodyMD}
                        style={tw.style('font-semibold')}
                      >
                        {strings(
                          'card.asset_selection.solana_not_supported_button_title',
                        )}
                      </Text>
                      <Text
                        variant={TextVariant.BodySM}
                        style={tw.style('font-medium text-text-alternative')}
                      >
                        {strings(
                          'card.asset_selection.solana_not_supported_button_description',
                        )}
                      </Text>
                    </Box>
                  </Box>

                  {/* Balance */}
                  <Box twClassName="items-end">
                    <Icon name={IconName.Export} size={IconSize.Md} />
                  </Box>
                </Box>
              </ListItemSelect>
            ) : undefined
          }
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
                        {item.walletAddress && (
                          <Text
                            variant={TextVariant.BodyXS}
                            style={tw.style(
                              'font-normal text-text-alternative mt-1',
                            )}
                            numberOfLines={1}
                          >
                            {truncateAddress(item.walletAddress, 6)}
                          </Text>
                        )}
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
            `${item.address}-${item.symbol}-${
              item.walletAddress
            }-${safeFormatChainIdToHex(item.caipChainId)}`
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
