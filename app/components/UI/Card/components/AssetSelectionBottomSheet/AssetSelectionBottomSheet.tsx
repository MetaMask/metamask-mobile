import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { ActivityIndicator, type ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import { FundingStatus, CardFundingToken } from '../../types';

import { strings } from '../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions } from '../../util/metrics';
import { getAssetBalanceKey } from '../../util/getAssetBalanceKey';
import { useUpdateFundingPriority } from '../../hooks/useUpdateFundingPriority';
import {
  createNavigationDetails,
  useParams,
  navigateWithDetails,
} from '../../../../../util/navigation/navUtils';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import AssetSelectionRow, {
  type AssetSelectionRowItem,
} from './AssetSelectionRow';

export interface AssetSelectionModalNavigationDetails {
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
  const navigation = useNavigation<AppNavigationProp>();
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

  // Read card data from state instead of navigation params
  const {
    availableTokens: homeAvailableTokens,
    primaryToken,
    balanceMap,
    data: cardHomeData,
  } = useCardHomeData();

  const supportedTokens = useMemo<CardFundingToken[]>(() => {
    const baseList = homeAvailableTokens.filter(
      (token) =>
        !token.isMoneyAccountEntry ||
        token.fundingStatus !== FundingStatus.NotEnabled,
    );

    const filtered = excludedTokens?.length
      ? baseList.filter(
          (token) =>
            !excludedTokens.some(
              (ex) =>
                ex.address?.toLowerCase() === token.address?.toLowerCase() &&
                ex.caipChainId === token.caipChainId,
            ),
        )
      : baseList;

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
      hasNoTimeout: false,
    });
  }, [toastRef, theme]);

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('card.asset_selection.update_error') }],
      iconName: IconName.Danger,
      iconColor: theme.colors.error.default,
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
            // Navigate back to the caller route with the selected token.
            // `callerRoute` is a dynamic string from modal params.
            navigateWithDetails(navigation, [
              callerRoute,
              {
                ...callerParams,
                returnedSelectedToken: token,
              },
            ]);
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
      callerRoute,
      callerParams,
      isPriorityToken,
      navigateToCardHomeOnPriorityToken,
      closeBottomSheetAndNavigate,
      navigation,
      updatePriority,
    ],
  );

  const renderItem: ListRenderItem<AssetSelectionRowItem> = useCallback(
    ({ item }) => (
      <AssetSelectionRow
        item={item}
        isPriority={Boolean(isPriorityToken(item))}
        onPress={handleTokenPress}
      />
    ),
    [isPriorityToken, handleTokenPress],
  );

  const keyExtractor = useCallback(
    (item: AssetSelectionRowItem) =>
      `${item.address}-${item.symbol}-${
        item.walletAddress
      }-${safeFormatChainIdToHex(item.caipChainId)}`,
    [],
  );

  const renderBottomSheetContent = useCallback(() => {
    if (!cardHomeData?.delegationSettings) {
      return (
        <Box twClassName="items-center justify-center py-8">
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </Box>
      );
    }

    if (supportedTokensWithBalances.length === 0) {
      return (
        <Box twClassName="items-center justify-center py-8">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('card.no_tokens_available')}
          </Text>
        </Box>
      );
    }

    return (
      <FlashList
        data={supportedTokensWithBalances}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        renderScrollComponent={
          ScrollView as React.ComponentType<ScrollViewProps>
        }
      />
    );
  }, [
    cardHomeData?.delegationSettings,
    supportedTokensWithBalances,
    theme,
    renderItem,
    keyExtractor,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('card.select_asset')}
      </BottomSheetHeader>
      <Box style={tw.style('grow shrink flex-row min-h-[200px] max-h-[400px]')}>
        {renderBottomSheetContent()}
      </Box>
    </BottomSheet>
  );
};

export default AssetSelectionBottomSheet;
