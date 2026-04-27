import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { FundingStatus, CardFundingToken } from '../../types';
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
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { FlatList } from 'react-native-gesture-handler';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions } from '../../util/metrics';
import { truncateAddress } from '../../util/truncateAddress';
import { getAssetBalanceKey } from '../../util/getAssetBalanceKey';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';
import { useUpdateFundingPriority } from '../../hooks/useUpdateFundingPriority';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useCardDelegationTransaction } from '../../../../Views/confirmations/hooks/card/useCardDelegationTransaction';

interface AssetSelectionModalNavigationDetails {
  navigateToCardHomeOnPriorityToken?: boolean;
  selectionOnly?: boolean;
  onTokenSelect?: (token: CardFundingToken) => void;
  callerRoute?: string;
  callerParams?: Record<string, unknown>;
  excludedTokens?: CardFundingToken[];
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
    navigateToCardHomeOnPriorityToken = false,
    selectionOnly = false,
    onTokenSelect,
    callerRoute,
    callerParams,
    excludedTokens,
  } = useParams<AssetSelectionModalNavigationDetails>();

  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { prepareAndNavigate: prepareCardDelegation } =
    useCardDelegationTransaction();

  // Read card data from state instead of navigation params
  const {
    availableTokens: homeAvailableTokens,
    primaryToken,
    balanceMap,
    data: cardHomeData,
  } = useCardHomeData();

  const supportedTokens = useMemo<CardFundingToken[]>(() => {
    const filtered = excludedTokens?.length
      ? homeAvailableTokens.filter(
          (token) =>
            !excludedTokens.some(
              (ex) =>
                ex.address?.toLowerCase() === token.address?.toLowerCase() &&
                ex.caipChainId === token.caipChainId,
            ),
        )
      : homeAvailableTokens;

    return [...filtered].sort((a, b) => {
      if (
        a.priority !== undefined &&
        a.priority !== null &&
        b.priority !== undefined &&
        b.priority !== null
      ) {
        return a.priority - b.priority;
      }
      if (a.priority !== undefined && a.priority !== null) return -1;
      if (b.priority !== undefined && b.priority !== null) return 1;
      if (
        a.fundingStatus === FundingStatus.Enabled &&
        b.fundingStatus !== FundingStatus.Enabled
      ) {
        return -1;
      }
      if (
        a.fundingStatus !== FundingStatus.Enabled &&
        b.fundingStatus === FundingStatus.Enabled
      ) {
        return 1;
      }
      return 0;
    });
  }, [homeAvailableTokens, excludedTokens]);

  // Balance data already enriched by useCardHomeData via useAssetBalances.
  // We only need to add display-formatted fields and a secondary sort by fiat.
  const supportedTokensWithBalances = useMemo(
    () =>
      supportedTokens
        .map((token) => {
          const balanceInfo = balanceMap.get(getAssetBalanceKey(token));
          return {
            ...token,
            balance: balanceInfo?.rawTokenBalance?.toFixed(6) || '0',
            balanceFiat: balanceInfo?.balanceFiat || '$0.00',
            rawFiatNumber: balanceInfo?.rawFiatNumber,
          };
        })
        .sort((a, b) => {
          if (
            a.fundingStatus === FundingStatus.NotEnabled &&
            b.fundingStatus === FundingStatus.NotEnabled
          ) {
            return (b.rawFiatNumber ?? -1) - (a.rawFiatNumber ?? -1);
          }
          return 0;
        }),
    [supportedTokens, balanceMap],
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

  const { updateFundingPriority } = useUpdateFundingPriority({
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
    async (token: CardFundingToken) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.ASSET_ITEM_SELECT_TOKEN_BOTTOMSHEET,
            bottomsheet_selected_token_symbol: token.symbol,
            bottomsheet_selected_token_chain_id: token.caipChainId,
            bottomsheet_selected_token_limit_amount: isNaN(
              Number(token.spendableBalance),
            )
              ? 0
              : Number(token.spendableBalance),
          })
          .build(),
      );

      await updateFundingPriority(token);
    },
    [updateFundingPriority, trackEvent, createEventBuilder],
  );

  const isPriorityToken = useCallback(
    (token: CardFundingToken) =>
      primaryToken &&
      primaryToken.address?.toLowerCase() === token.address?.toLowerCase() &&
      primaryToken.caipChainId === token.caipChainId &&
      primaryToken.walletAddress?.toLowerCase() ===
        token.walletAddress?.toLowerCase(),
    [primaryToken],
  );

  const handleTokenPress = useCallback(
    async (token: CardFundingToken) => {
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
        token.fundingStatus === FundingStatus.Enabled ||
        token.fundingStatus === FundingStatus.Limited
      ) {
        await updatePriority(token);
      } else {
        closeBottomSheetAndNavigate(async () => {
          await prepareCardDelegation({
            flow: 'manage',
            token,
            canChangeToken: false,
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
      prepareCardDelegation,
    ],
  );

  // Helper: Get funding status text
  const getFundingStatusText = useCallback((state: FundingStatus): string => {
    if (state === FundingStatus.Enabled) {
      return strings('card.asset_selection.enabled');
    }
    if (state === FundingStatus.Limited) {
      return strings('card.asset_selection.limited');
    }
    return strings('card.asset_selection.not_enabled');
  }, []);

  // Helper: Render bottom sheet content based on state
  const renderBottomSheetContent = useCallback(() => {
    // Loading state
    if (!cardHomeData?.delegationSettings) {
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
                            item.address ?? '',
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
                        {getFundingStatusText(item.fundingStatus)}
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
    cardHomeData?.delegationSettings,
    supportedTokensWithBalances,
    tw,
    theme,
    isPriorityToken,
    handleTokenPress,
    getFundingStatusText,
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
