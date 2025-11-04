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
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  clearCacheData,
  selectUserCardLocation,
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
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';

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
  onTokenSelect?: (token: CardTokenAllowance) => void;
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
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const userCardLocation = useSelector(selectUserCardLocation);

  // Get supported tokens from the card SDK to display in the bottom sheet.
  const cardSupportedTokens = useMemo(
    () => sdk?.getSupportedTokensByChainId(sdk?.lineaChainId) ?? [],
    [sdk],
  );

  // Map user's actual wallets/tokens to display format + add supported tokens from delegation settings
  // This preserves duplicates (same token on same chain but different wallet addresses)
  const supportedTokens = useMemo<CardTokenAllowance[]>(() => {
    if (!sdk) return [];

    // Determine which Linea chain IDs are valid for this user's location
    const validLineaChainIds = new Set<string>();
    if (delegationSettings?.networks) {
      for (const network of delegationSettings.networks) {
        const isLineaNetwork =
          network.network === 'linea' || network.network === 'linea-us';
        if (!isLineaNetwork) continue;

        // Filter networks based on user location
        const shouldIncludeNetwork =
          (userCardLocation === 'us' && network.network === 'linea-us') ||
          (userCardLocation !== 'us' && network.network === 'linea');

        if (shouldIncludeNetwork) {
          // Extract numeric chain ID
          const chainIdStr = network.chainId;
          let numericChainId: number;
          if (chainIdStr.startsWith('0x')) {
            numericChainId = parseInt(chainIdStr, 16);
          } else {
            numericChainId = parseInt(chainIdStr, 10);
          }
          validLineaChainIds.add(`eip155:${numericChainId}`);
        }
      }
    }

    // Start with user's actual wallet tokens (if any)
    const userTokens: CardTokenAllowance[] = (tokensWithAllowances || [])
      .map((userToken) => {
        const chainName = mapCaipChainIdToChainName(userToken.caipChainId);

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

        // For Linea tokens, filter based on user location
        const isLineaToken = token.chainName.toLowerCase() === 'linea';
        if (isLineaToken) {
          // Only show if this chain ID is valid for user's location
          // If validLineaChainIds is empty, don't filter (show all Linea tokens)
          if (
            validLineaChainIds.size > 0 &&
            !validLineaChainIds.has(token.caipChainId)
          ) {
            return false;
          }
        }

        return true;
      });

    // Add supported tokens from delegation settings that user doesn't have in wallet
    const supportedFromSettings: CardTokenAllowance[] = [];

    if (delegationSettings?.networks) {
      for (const network of delegationSettings.networks) {
        // network.network is the network name from the delegation settings.
        // It can be 'linea', 'linea-us', 'solana', etc.
        // Filter based on userCardLocation: show only linea-us for US users, linea for non-US users

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

        // Filter Linea networks based on user location
        const isLineaNetwork =
          network.network === 'linea' || network.network === 'linea-us';
        if (isLineaNetwork) {
          const shouldIncludeNetwork =
            (userCardLocation === 'us' && network.network === 'linea-us') ||
            (userCardLocation !== 'us' && network.network === 'linea');

          if (!shouldIncludeNetwork) {
            continue;
          }
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
            const chainMatch = userToken.caipChainId === caipChainId;

            return addressMatch && chainMatch;
          });

          // Also check if user already has a token with the same symbol on the same chain
          // (to avoid showing different contract addresses with same symbol, which confuses UX)
          const userHasSameSymbolOnChain = userTokens.some((userToken) => {
            const symbolMatch =
              userToken.symbol?.toUpperCase() ===
              tokenConfig.symbol?.toUpperCase();
            const chainMatch = userToken.caipChainId === caipChainId;

            return symbolMatch && chainMatch;
          });

          // Also check if we've already added this token from delegation settings
          // (to avoid duplicates from multiple network configs like 'linea' and 'linea-us')
          const existsInSettings = supportedFromSettings.some(
            (settingsToken) => {
              if (!settingsToken.address) return false;
              const addressMatch =
                settingsToken.address.toLowerCase() === tokenAddressLower;
              // The delegation settings returns the chain id in the decimal format.
              const chainMatch = settingsToken.caipChainId === caipChainId;

              return addressMatch && chainMatch;
            },
          );

          // Skip if:
          // 1. User already has this exact token (same address + chain)
          // 2. Token already exists in settings from previous network config
          // 3. User already has a token with same symbol on same chain (avoid showing multiple USDC contracts)
          // 4. For Solana tokens from delegation settings: only show if user already has them enabled
          //    Don't show not-enabled Solana tokens from delegation settings
          if (
            existsInUserTokens ||
            existsInSettings ||
            userHasSameSymbolOnChain ||
            isSolana // Solana tokens from delegation settings should not appear (user must have them in wallet first)
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

          supportedFromSettings.push({
            address: tokenAddress,
            symbol: tokenConfig.symbol.toUpperCase(),
            name: tokenConfig.symbol.toUpperCase(),
            decimals: tokenConfig.decimals,
            caipChainId,
            walletAddress: undefined, // No wallet address since user doesn't have this token
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

      if (
        a.allowanceState === AllowanceState.Enabled &&
        b.allowanceState !== AllowanceState.Enabled
      )
        return -1;
      if (
        a.allowanceState !== AllowanceState.Enabled &&
        b.allowanceState === AllowanceState.Enabled
      )
        return 1;

      return 0;
    });
  }, [
    tokensWithAllowances,
    sdk,
    hideSolanaAssets,
    delegationSettings,
    cardSupportedTokens,
    userCardLocation,
  ]);

  // Get balances for all tokens (including those from delegation settings)
  const assetBalances = useAssetBalances(supportedTokens);

  // Merge balance data into supportedTokens
  const supportedTokensWithBalances: (CardTokenAllowance & {
    balance: string;
    balanceFiat: string;
  })[] = useMemo(
    () =>
      supportedTokens.map((token) => {
        const tokenKey = `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;
        const balanceInfo = assetBalances.get(tokenKey);

        return {
          ...token,
          balance: balanceInfo?.rawTokenBalance?.toFixed(6) || '0',
          balanceFiat: balanceInfo?.balanceFiat || '$0.00',
        };
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
    async (token: CardTokenAllowance) => {
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
          availableBalance: token.availableBalance || '0',
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
    (token: CardTokenAllowance) =>
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
    async (token: CardTokenAllowance) => {
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
      } else if (token.allowanceState === AllowanceState.Enabled) {
        // Token is already delegated, update priority directly
        await updatePriority(token);
      } else {
        // Token is not delegated, navigate to Spending Limit screen to enable it
        // Use 'manage' flow to maintain "Change token and network" context
        closeBottomSheetAndNavigate(() => {
          navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
            flow: 'manage',
            selectedToken: token,
            priorityToken: cardExternalWalletDetails?.priorityWalletDetail,
            allTokens: tokensWithAllowances,
            delegationSettings,
            externalWalletDetailsData: cardExternalWalletDetails,
          });
        });
      }
    },
    [
      selectionOnly,
      onTokenSelect,
      isPriorityToken,
      navigateToCardHomeOnPriorityToken,
      closeBottomSheetAndNavigate,
      navigation,
      setOpenAssetSelectionBottomSheet,
      updatePriority,
      cardExternalWalletDetails,
      tokensWithAllowances,
      delegationSettings,
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
                <ListItemSelect
                  onPress={() => handleTokenPress(item)}
                  testID={`asset-select-item-${item.symbol}-${item.caipChainId}`}
                >
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
                          imageSource={{
                            uri: buildTokenIconUrl(
                              item.caipChainId,
                              item.address || '',
                            ),
                          }}
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
                          {item.symbol} on{' '}
                          {mapCaipChainIdToChainName(item.caipChainId)}
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
