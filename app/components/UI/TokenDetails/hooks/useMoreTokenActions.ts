import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { IconName } from '@metamask/design-system-react-native';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import Routes from '../../../../constants/navigation/Routes';
import NotificationManager from '../../../../core/NotificationManager';
import { getDecimalChainId } from '../../../../util/networks';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { trackBlockExplorerLinkClicked } from '../../../../util/analytics/externalLinkTracking';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../Views/WalletActions/WalletActionsBottomSheet.testIds';
import Logger from '../../../../util/Logger';
import { TokenI } from '../../Tokens/types';
import { RootState } from '../../../../reducers';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { isMusdToken } from '../../Earn/constants/musd';
import useAssetVisibility from '../components/useAssetVisibility';
import { TokenDetailsAction } from '../constants/constants';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { removeNonEvmToken } from '../../Tokens/util/removeNonEvmToken';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useAssetActivation } from './useAssetActivation';

export interface MoreTokenActionConfig {
  type: string;
  label: string;
  description?: string;
  iconName: IconName;
  testID: string;
  isDisabled?: boolean;
  onPress: () => void;
}

export interface UseMoreTokenActionsParams {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  isNativeCurrency: boolean;
  asset: TokenI;
  onBuy: () => void;
  onReceive?: () => void;
  onActionTapped?: (action: TokenDetailsAction) => void;
  /** Dismisses the surface that shows these actions, then runs `callback`. */
  closeAndRun: (callback: () => void) => void;
}

/**
 * The secondary token actions: Receive and Cash buy when a perps market takes
 * their place in the main row, View on block explorer, Remove token, and
 * Deactivate trustline.
 */
export const useMoreTokenActions = ({
  hasPerpsMarket,
  hasBalance,
  isBuyable,
  isNativeCurrency,
  asset,
  onBuy,
  onReceive,
  onActionTapped,
  closeAndRun,
}: UseMoreTokenActionsParams): MoreTokenActionConfig[] => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const explorer = useBlockExplorer(asset.chainId);

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const { handleHideToken } = useAssetVisibility(asset);

  const { deactivateAsset, canDeactivate, isDeactivating } = useAssetActivation(
    {
      assetId: asset.address,
      assetSymbol: asset.symbol,
    },
  );

  const goToBrowserUrl = useCallback(
    (url: string, title: string) => {
      closeAndRun(async () => {
        navigation.navigate('WalletView');

        try {
          if (await InAppBrowser.isAvailable()) {
            await InAppBrowser.open(url);
            return;
          }
        } catch (error) {
          Logger.error(
            error as Error,
            'MoreTokenActionsMenu: Failed to open InAppBrowser',
          );
        }

        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: { url, title },
        });
      });
    },
    [closeAndRun, navigation],
  );

  const handleBuy = useCallback(() => {
    closeAndRun(onBuy);
  }, [closeAndRun, onBuy]);

  const handleReceive = useCallback(() => {
    closeAndRun(() => {
      onReceive?.();
    });
  }, [closeAndRun, onReceive]);

  const handleViewOnBlockExplorer = useCallback(() => {
    let url: string | null;
    if (isNativeCurrency) {
      url = explorer.getBlockExplorerBaseUrl(asset.chainId);
    } else {
      const tokenAddress = isCaipAssetType(asset.address)
        ? parseCaipAssetType(asset.address).assetReference
        : asset.address;
      url = explorer.getBlockExplorerTokenUrl(tokenAddress, asset.chainId);
    }

    if (url) {
      trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
        location: 'token_details_menu',
        text: strings('asset_details.options.view_on_block'),
        url,
      });
      onActionTapped?.(TokenDetailsAction.ViewOnExplorer);
      goToBrowserUrl(url, explorer.getBlockExplorerName(asset.chainId));
    }
  }, [
    createEventBuilder,
    isNativeCurrency,
    explorer,
    asset.chainId,
    asset.address,
    goToBrowserUrl,
    onActionTapped,
    trackEvent,
  ]);

  const handleRemoveToken = useCallback(() => {
    onActionTapped?.(TokenDetailsAction.RemoveToken);
    closeAndRun(() => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: 'AssetHideConfirmation',
        params: {
          onConfirm: async () => {
            navigation.navigate('WalletView');
            try {
              if (asset.chainId && isNonEvmChainId(asset.chainId)) {
                await removeNonEvmToken({
                  tokenAddress: asset.address,
                  tokenChainId: asset.chainId,
                  selectInternalAccountByScope,
                });
              }

              handleHideToken();

              const tokenSymbol = asset.symbol || null;

              NotificationManager.showSimpleNotification({
                status: 'simple_notification',
                duration: 5000,
                title: strings('wallet.token_toast.token_hidden_title'),
                description: strings('wallet.token_toast.token_hidden_desc', {
                  tokenSymbol,
                }),
              });

              trackEvent(
                createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
                  .addProperties({
                    location: 'token_details',
                    token_standard: 'ERC20',
                    asset_type: 'token',
                    tokens: [`${tokenSymbol} - ${asset.address}`],
                    chain_id: getDecimalChainId(asset.chainId),
                  })
                  .build(),
              );
            } catch (err) {
              Logger.log(err, 'MoreTokenActionsMenu: Failed to hide token!');
            }
          },
        },
      });
    });
  }, [
    closeAndRun,
    navigation,
    asset.chainId,
    asset.address,
    asset.symbol,
    handleHideToken,
    selectInternalAccountByScope,
    trackEvent,
    createEventBuilder,
    onActionTapped,
  ]);

  const handleDeactivateTrustline = useCallback(() => {
    closeAndRun(async () => {
      const { success, errorMessage } = await deactivateAsset();

      if (errorMessage) {
        NotificationManager.showSimpleNotification({
          status: 'error',
          duration: 5000,
          title: strings('transactions.activity_trustline_deactivation_failed'),
          description: errorMessage,
        });
        return;
      }

      if (success) {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
    });
  }, [closeAndRun, deactivateAsset, navigation]);

  const tokenIsInAccount = !!useSelector((state: RootState) =>
    selectAsset(state, {
      address: asset.address,
      chainId: asset.chainId as string,
      isStaked: asset.isStaked || false,
    }),
  );

  return useMemo(() => {
    const actions: MoreTokenActionConfig[] = [];

    // The main row shows Send instead of Receive when a perps market is active
    // and the user holds the token.
    if (hasPerpsMarket && hasBalance && onReceive) {
      actions.push({
        type: 'receive',
        label: strings('asset_overview.receive_button'),
        iconName: IconName.QrCode,
        testID: 'more-actions-receive',
        onPress: handleReceive,
      });
    }

    // The main row shows Long and Short instead of Cash Buy when a perps market is active.
    if (hasPerpsMarket && isBuyable) {
      actions.push({
        type: 'cash-buy',
        label: `Cash buy ${asset.symbol}`,
        iconName: IconName.AttachMoney,
        testID: WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
        onPress: handleBuy,
      });
    }

    if (explorer.getBlockExplorerName(asset.chainId)) {
      actions.push({
        type: 'view-explorer',
        label: strings('asset_details.options.view_on_block'),
        iconName: IconName.ArrowSquareOut,
        testID: 'more-actions-view-explorer',
        onPress: handleViewOnBlockExplorer,
      });
    }

    if (!isNativeCurrency && tokenIsInAccount && !isMusdToken(asset.address)) {
      actions.push({
        type: 'remove-token',
        label: strings('asset_details.options.remove_token'),
        iconName: IconName.Trash,
        testID: 'more-actions-remove-token',
        onPress: handleRemoveToken,
      });
    }

    if (canDeactivate) {
      actions.push({
        type: 'stellar-deactivate-trustline',
        label: strings('asset_details.options.deactivate_asset'),
        iconName: IconName.Trash,
        testID: 'more-actions-deactivate-asset',
        isDisabled: isDeactivating,
        onPress: handleDeactivateTrustline,
      });
    }

    return actions;
  }, [
    asset.address,
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    isNativeCurrency,
    asset.chainId,
    asset.symbol,
    explorer,
    tokenIsInAccount,
    onReceive,
    handleReceive,
    handleBuy,
    handleViewOnBlockExplorer,
    handleRemoveToken,
    handleDeactivateTrustline,
    canDeactivate,
    isDeactivating,
  ]);
};
