import React, { useCallback, useContext, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import {
  AllowanceState,
  CardExternalWalletDetail,
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
}

export interface AssetSelectionBottomSheetProps {
  setOpenAssetSelectionBottomSheet: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
  priorityToken: CardTokenAllowance | null;
  tokensWithAllowances: CardTokenAllowance[];
  delegationSettings: DelegationSettingsResponse | null;
  cardExternalWalletDetails?: {
    walletDetails?: CardExternalWalletDetail[];
  } | null;
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
  priorityToken,
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

  // Map user's actual wallets/tokens to display format
  // This preserves duplicates (same token on same chain but different wallet addresses)
  const supportedTokens = useMemo<SupportedTokenWithChain[]>(() => {
    if (!tokensWithAllowances?.length || !sdk) return [];

    const allTokens: SupportedTokenWithChain[] = tokensWithAllowances
      .map((userToken) => {
        // Determine chain name
        const isSolana =
          userToken.caipChainId === SolScope.Mainnet ||
          userToken.caipChainId?.startsWith('solana:');
        const chainName = isSolana ? 'Solana' : 'Linea';

        // Build token icon URL
        const iconUrl = buildTokenIconUrl(
          userToken.caipChainId,
          userToken.address || '',
        );

        // Format balance
        const balance = userToken.availableBalance
          ? parseFloat(userToken.availableBalance).toFixed(6)
          : '0';
        const balanceFiat = `$${parseFloat(balance).toFixed(2)} USD`;

        return {
          address: userToken.address ?? '',
          symbol: userToken.symbol?.toUpperCase() ?? '',
          name: userToken.name ?? userToken.symbol?.toUpperCase() ?? '',
          decimals: userToken.decimals ?? 0,
          enabled: userToken.allowanceState !== AllowanceState.NotEnabled,
          caipChainId: userToken.caipChainId,
          chainName,
          walletAddress: userToken.walletAddress,
          balance,
          balanceFiat,
          image: iconUrl,
          logo: iconUrl,
          allowanceState: userToken.allowanceState,
          allowance: userToken.allowance || '0',
          delegationContract: userToken.delegationContract ?? undefined,
          priority: userToken.priority, // Preserve priority from API
        };
      })
      .filter((token) => {
        // Filter out unsupported networks
        const networkLower = token.chainName.toLowerCase();
        if (
          !SUPPORTED_ASSET_NETWORKS.includes(networkLower) &&
          networkLower !== 'linea'
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

        // For Solana assets, only show enabled tokens
        if (isSolana && !token.enabled) {
          return false;
        }

        return true;
      });

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
        priorityToken &&
        a.address?.toLowerCase() === priorityToken.address?.toLowerCase() &&
        a.caipChainId === priorityToken.caipChainId &&
        a.walletAddress?.toLowerCase() ===
          priorityToken.walletAddress?.toLowerCase();
      const bIsPriority =
        priorityToken &&
        b.address?.toLowerCase() === priorityToken.address?.toLowerCase() &&
        b.caipChainId === priorityToken.caipChainId &&
        b.walletAddress?.toLowerCase() ===
          priorityToken.walletAddress?.toLowerCase();

      if (aIsPriority) return -1;
      if (bIsPriority) return 1;

      // Sort enabled tokens before disabled tokens
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;

      return 0;
    });
  }, [tokensWithAllowances, priorityToken, sdk, hideSolanaAssets]);

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
      priorityToken &&
      priorityToken.address?.toLowerCase() === token.address?.toLowerCase() &&
      priorityToken.caipChainId === token.caipChainId &&
      priorityToken.walletAddress?.toLowerCase() ===
        token.walletAddress?.toLowerCase(),
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
        // Token is not delegated, navigate to Spending Limit screen to enable it
        closeBottomSheetAndNavigate(() => {
          navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
            flow: 'enable',
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
      ) : supportedTokens.length > 0 ? (
        <FlatList
          scrollEnabled
          data={supportedTokens}
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
