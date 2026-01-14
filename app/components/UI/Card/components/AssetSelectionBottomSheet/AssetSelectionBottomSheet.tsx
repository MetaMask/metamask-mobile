import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import {
  AllowanceState,
  CardExternalWalletDetailsResponse,
  CardNetwork,
  CardTokenAllowance,
  DelegationSettingsResponse,
} from '../../types';
import { useSelector } from 'react-redux';
import { selectUserCardLocation } from '../../../../../core/redux/slices/card';
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
import { useAssetBalances } from '../../hooks/useAssetBalances';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';
import { useUpdateTokenPriority } from '../../hooks/useUpdateTokenPriority';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import {
  getCaipChainId,
  getValidLineaChainIds,
  normalizeSymbol,
  shouldProcessNetwork,
} from '../../util/buildTokenList';

interface AssetSelectionModalNavigationDetails {
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
  selectionOnly?: boolean;
  onTokenSelect?: (token: CardTokenAllowance) => void;
  hideSolanaAssets?: boolean;
  // For navigation-based selection mode: where to return with the selected token
  callerRoute?: string;
  callerParams?: Record<string, unknown>;
}

export const createAssetSelectionModalNavigationDetails =
  createNavigationDetails<AssetSelectionModalNavigationDetails>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.ASSET_SELECTION,
  );

const AssetSelectionBottomSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const {
    tokensWithAllowances,
    delegationSettings,
    cardExternalWalletDetails,
    navigateToCardHomeOnPriorityToken = false,
    selectionOnly = false,
    onTokenSelect,
    hideSolanaAssets = false,
    callerRoute,
    callerParams,
  } = useParams<AssetSelectionModalNavigationDetails>();

  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { sdk } = useCardSDK();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const userCardLocation = useSelector(selectUserCardLocation);

  // Helper: Get valid Linea chain IDs based on user location (uses shared utility)
  const getValidLineaChainIdsForLocation = useCallback(
    (settings: DelegationSettingsResponse | null): Set<string> =>
      getValidLineaChainIds(settings, userCardLocation),
    [userCardLocation],
  );

  // Helper: Check if token should be filtered out
  const shouldFilterOutToken = useCallback(
    (
      token: CardTokenAllowance & { chainName: string },
      validLineaChainIds: Set<string>,
      hideSolana: boolean,
    ): boolean => {
      const networkLower = token.chainName.toLowerCase();

      // Allow tokens even if chain is unknown to avoid hiding available assets
      if (!SUPPORTED_ASSET_NETWORKS.includes(networkLower as CardNetwork)) {
        // Still allow unknown networks to show tokens/logos rather than hiding
        if (networkLower !== 'unknown') {
          return true;
        }
      }

      const isSolana =
        token.caipChainId === SolScope.Mainnet ||
        token.caipChainId?.startsWith('solana:');

      // Filter Solana if requested
      if (hideSolana && isSolana) {
        return true;
      }

      // Filter Linea tokens by location
      const isLineaToken = networkLower === 'linea';
      if (isLineaToken && validLineaChainIds.size > 0) {
        return !validLineaChainIds.has(token.caipChainId);
      }

      return false;
    },
    [],
  );

  // Helper: Map user tokens to display format (uses shared normalizeSymbol)
  const mapUserToken = useCallback(
    (
      userToken: CardTokenAllowance,
    ): CardTokenAllowance & { chainName: string } => {
      const chainName = mapCaipChainIdToChainName(userToken.caipChainId);
      const supportedToken = sdk
        ?.getSupportedTokensByChainId(userToken.caipChainId)
        ?.find(
          (token) =>
            token.address?.toLowerCase() === userToken.address?.toLowerCase() &&
            token.symbol?.toLowerCase() === userToken.symbol?.toLowerCase(),
        );

      // Normalize symbol using shared utility
      const displaySymbol = normalizeSymbol(
        supportedToken?.symbol ?? userToken.symbol ?? '',
      );

      return {
        ...userToken,
        address: userToken.address ?? '',
        symbol: displaySymbol,
        name: supportedToken?.name ?? userToken.name ?? displaySymbol,
        decimals: userToken.decimals ?? 0,
        chainName,
        allowance: userToken.allowance || '0',
        delegationContract: userToken.delegationContract ?? undefined,
        stagingTokenAddress: userToken.stagingTokenAddress ?? undefined,
      } as CardTokenAllowance & { chainName: string };
    },
    [sdk],
  );

  // Helper: Check if token exists in user tokens
  const tokenExistsInUserTokens = useCallback(
    (
      userTokens: CardTokenAllowance[],
      address: string,
      caipChainId: CaipChainId,
      symbol?: string,
    ): {
      exactMatch: boolean;
      symbolMatch: boolean;
    } => {
      const addressLower = address.toLowerCase();
      const symbolUpper = symbol?.toUpperCase();

      let exactMatch = false;
      let symbolMatch = false;

      for (const userToken of userTokens) {
        if (!userToken.address) continue;

        const addressMatches = userToken.address.toLowerCase() === addressLower;
        const chainMatches = userToken.caipChainId === caipChainId;

        if (addressMatches && chainMatches) {
          exactMatch = true;
        }

        if (
          symbolUpper &&
          userToken.symbol?.toUpperCase() === symbolUpper &&
          chainMatches
        ) {
          symbolMatch = true;
        }
      }

      return { exactMatch, symbolMatch };
    },
    [],
  );

  // Helper: Check if network should be processed (uses shared utility)
  const shouldProcessNetworkForLocation = useCallback(
    (
      network: DelegationSettingsResponse['networks'][0],
      hideSolana: boolean,
    ): boolean => shouldProcessNetwork(network, userCardLocation, hideSolana),
    [userCardLocation],
  );

  // Helper: Get token address (handles staging/development environments)
  const getTokenAddress = useCallback(
    (
      tokenConfig: { address: string; symbol: string },
      network: DelegationSettingsResponse['networks'][0],
      caipChainId: CaipChainId,
    ): string => {
      const isNonProduction = network.environment !== 'production';
      if (!isNonProduction) {
        return tokenConfig.address;
      }

      // Use SDK to get tokens for the specific chain to find the correct address
      const chainTokens = sdk?.getSupportedTokensByChainId(caipChainId) ?? [];
      const cardToken = chainTokens.find(
        (token) =>
          tokenConfig.symbol.toUpperCase() === token.symbol?.toUpperCase(),
      );

      return cardToken?.address || tokenConfig.address;
    },
    [sdk],
  );

  // Helper: Sort tokens by priority
  const sortTokensByPriority = useCallback(
    (a: CardTokenAllowance, b: CardTokenAllowance): number => {
      // Sort by priority if both have values
      if (
        a.priority !== undefined &&
        a.priority !== null &&
        b.priority !== undefined &&
        b.priority !== null
      ) {
        return a.priority - b.priority;
      }

      // Prioritize tokens with priority values
      if (a.priority !== undefined && a.priority !== null) return -1;
      if (b.priority !== undefined && b.priority !== null) return 1;

      // Sort by allowance state
      if (
        a.allowanceState === AllowanceState.Enabled &&
        b.allowanceState !== AllowanceState.Enabled
      ) {
        return -1;
      }
      if (
        a.allowanceState !== AllowanceState.Enabled &&
        b.allowanceState === AllowanceState.Enabled
      ) {
        return 1;
      }

      return 0;
    },
    [],
  );

  // Map user's actual wallets/tokens to display format + add supported tokens from delegation settings
  // This preserves duplicates (same token on same chain but different wallet addresses)
  const supportedTokens = useMemo<CardTokenAllowance[]>(() => {
    if (!sdk) return [];

    const validLineaChainIds =
      getValidLineaChainIdsForLocation(delegationSettings);

    // Process user tokens
    const userTokens: CardTokenAllowance[] = (tokensWithAllowances || [])
      .map(mapUserToken)
      .filter(
        (token) =>
          !shouldFilterOutToken(token, validLineaChainIds, hideSolanaAssets),
      );

    // Add supported tokens from delegation settings that user doesn't have in wallet
    const supportedFromSettings: CardTokenAllowance[] = [];

    if (delegationSettings?.networks) {
      for (const network of delegationSettings.networks) {
        if (!shouldProcessNetworkForLocation(network, hideSolanaAssets)) {
          continue;
        }

        const caipChainId = getCaipChainId(network);
        const isSolana = network.network === 'solana';

        for (const [, tokenConfig] of Object.entries(network.tokens)) {
          if (!tokenConfig.address) continue;

          // Check various conditions for skipping this token
          const { exactMatch, symbolMatch } = tokenExistsInUserTokens(
            userTokens,
            tokenConfig.address,
            caipChainId,
            tokenConfig.symbol,
          );

          const existsInSettings = supportedFromSettings.some(
            (settingsToken) =>
              settingsToken.address?.toLowerCase() ===
                tokenConfig.address.toLowerCase() &&
              settingsToken.caipChainId === caipChainId,
          );

          // Skip if any of these conditions are met
          if (exactMatch || existsInSettings || symbolMatch || isSolana) {
            continue;
          }

          const tokenAddress = getTokenAddress(
            tokenConfig,
            network,
            caipChainId,
          );
          const isNonProduction = network.environment !== 'production';
          const supportedToken = sdk
            ?.getSupportedTokensByChainId(caipChainId)
            ?.find(
              (token) =>
                token.address?.toLowerCase() ===
                  tokenConfig.address?.toLowerCase() &&
                token.symbol?.toLowerCase() ===
                  tokenConfig.symbol?.toLowerCase(),
            );

          // Normalize symbol using shared utility
          const settingsSymbol = normalizeSymbol(
            supportedToken?.symbol ?? tokenConfig.symbol,
          );

          supportedFromSettings.push({
            address: tokenAddress,
            symbol: settingsSymbol,
            name: supportedToken?.name ?? settingsSymbol,
            decimals: tokenConfig.decimals,
            caipChainId,
            walletAddress: undefined,
            allowanceState: AllowanceState.NotEnabled,
            allowance: '0',
            delegationContract: network.delegationContract,
            priority: undefined,
            stagingTokenAddress: isNonProduction
              ? tokenConfig.address
              : undefined,
          });
        }
      }
    }

    // Combine and sort tokens
    return [...userTokens, ...supportedFromSettings].sort(sortTokensByPriority);
  }, [
    tokensWithAllowances,
    sdk,
    hideSolanaAssets,
    delegationSettings,
    getValidLineaChainIdsForLocation,
    mapUserToken,
    shouldFilterOutToken,
    shouldProcessNetworkForLocation,
    tokenExistsInUserTokens,
    getTokenAddress,
    sortTokensByPriority,
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

  const { updateTokenPriority } = useUpdateTokenPriority({
    onSuccess: () => {
      showSuccessToast();
      sheetRef.current?.onCloseBottomSheet();
    },
    onError: () => {
      showErrorToast();
      sheetRef.current?.onCloseBottomSheet();
    },
  });

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

      if (!cardExternalWalletDetails?.walletDetails) {
        showErrorToast();
        sheetRef.current?.onCloseBottomSheet();
        return;
      }

      await updateTokenPriority(token, cardExternalWalletDetails.walletDetails);
    },
    [
      cardExternalWalletDetails,
      updateTokenPriority,
      showErrorToast,
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
      // Selection only mode: navigate back with the selected token
      if (selectionOnly) {
        // If onTokenSelect callback is provided (legacy mode), use it
        if (onTokenSelect) {
          onTokenSelect(token);
          sheetRef.current?.onCloseBottomSheet();
          return;
        }

        // Navigation-based mode: go back with the selected token
        closeBottomSheetAndNavigate(() => {
          if (callerRoute) {
            // Navigate back to the caller route with the selected token
            navigation.navigate(callerRoute, {
              ...callerParams,
              returnedSelectedToken: token,
            });
          } else {
            // Fallback: just go back
            navigation.goBack();
          }
        });
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
          sheetRef.current?.onCloseBottomSheet();
        }
      } else if (
        token.allowanceState === AllowanceState.Enabled ||
        token.allowanceState === AllowanceState.Limited
      ) {
        await updatePriority(token);
      } else {
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
      callerRoute,
      callerParams,
      isPriorityToken,
      navigateToCardHomeOnPriorityToken,
      closeBottomSheetAndNavigate,
      navigation,
      updatePriority,
      cardExternalWalletDetails,
      tokensWithAllowances,
      delegationSettings,
    ],
  );

  // Helper: Get allowance state text
  const getAllowanceStateText = useCallback((state: AllowanceState): string => {
    if (state === AllowanceState.Enabled) {
      return strings('card.asset_selection.enabled');
    }
    if (state === AllowanceState.Limited) {
      return strings('card.asset_selection.limited');
    }
    return strings('card.asset_selection.not_enabled');
  }, []);

  // Helper: Render bottom sheet content based on state
  const renderBottomSheetContent = useCallback(() => {
    // Loading state
    if (!delegationSettings) {
      return (
        <View style={tw.style('items-center justify-center py-8')}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </View>
      );
    }

    // Empty state
    if (supportedTokensWithBalances.length === 0) {
      return (
        <View style={tw.style('items-center justify-center py-8')}>
          <Text
            variant={TextVariant.BodySM}
            style={tw.style('text-center text-text-alternative')}
          >
            {strings('card.no_tokens_available')}
          </Text>
        </View>
      );
    }

    // Token list
    return (
      <FlatList
        scrollEnabled
        showsVerticalScrollIndicator={false}
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
                            // For EVM non-Linea chains (e.g., Base), use stagingTokenAddress as it contains the correct
                            // production address for that chain. For Linea and Solana, use address directly.
                            item.caipChainId !== 'eip155:59144' &&
                              !item.caipChainId?.startsWith('solana:') &&
                              item.stagingTokenAddress
                              ? item.stagingTokenAddress
                              : item.address || '',
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
                        {getAllowanceStateText(item.allowanceState)}
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
    );
  }, [
    delegationSettings,
    supportedTokensWithBalances,
    hideSolanaAssets,
    tw,
    theme,
    navigateToCardPage,
    isPriorityToken,
    handleTokenPress,
    getAllowanceStateText,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('card.select_asset')}
        </Text>
      </BottomSheetHeader>
      <View style={tw.style('max-h-[400px]')}>
        {renderBottomSheetContent()}
      </View>
    </BottomSheet>
  );
};

export default AssetSelectionBottomSheet;
