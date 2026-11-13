import React, { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { IconName, Box } from '@metamask/design-system-react-native';
import ActionListItem from '../../../../component-library/components-temp/ActionListItem';
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
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { TokenI } from '../../Tokens/types';
import { RootState } from '../../../../reducers';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { isMusdToken } from '../../../UI/Earn/constants/musd';
import useAssetVisibility from './useAssetVisibility';
import { TokenDetailsAction } from '../constants/constants';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { removeNonEvmToken } from '../../Tokens/util/removeNonEvmToken';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useAssetActivation } from '../hooks/useAssetActivation';

export interface MoreTokenActionsMenuParams {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  isNativeCurrency: boolean;
  asset: TokenI;
  onBuy: () => void;
  onReceive?: () => void;
  onActionTapped?: (action: TokenDetailsAction) => void;
}

type MoreTokenActionsMenuRouteProp = RouteProp<
  { MoreTokenActionsMenu: MoreTokenActionsMenuParams },
  'MoreTokenActionsMenu'
>;

function symbolOrNull(symbol: string): string | null {
  if (!symbol) {
    return null;
  }
  return symbol;
}

type ActionKind =
  | 'receive'
  | 'cash-buy'
  | 'view-explorer'
  | 'remove-token'
  | 'stellar-deactivate-trustline';

interface ActionDescriptor {
  kind: ActionKind;
  label: string;
  iconName: IconName;
  testID: string;
  isDisabled?: boolean;
}

interface BuildActionDescriptorsParams {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  hasOnReceive: boolean;
  assetSymbol: string;
  hasBlockExplorer: boolean;
  showRemoveToken: boolean;
  canDeactivate: boolean;
  isDeactivating: boolean;
}

function buildActionDescriptors({
  hasPerpsMarket,
  hasBalance,
  isBuyable,
  hasOnReceive,
  assetSymbol,
  hasBlockExplorer,
  showRemoveToken,
  canDeactivate,
  isDeactivating,
}: BuildActionDescriptorsParams): ActionDescriptor[] {
  const actions: ActionDescriptor[] = [];
  if (hasPerpsMarket && hasBalance && hasOnReceive) {
    actions.push({
      kind: 'receive',
      label: strings('asset_overview.receive_button'),
      iconName: IconName.QrCode,
      testID: 'more-actions-receive',
    });
  }
  if (hasPerpsMarket && isBuyable) {
    actions.push({
      kind: 'cash-buy',
      label: `Cash buy ${assetSymbol}`,
      iconName: IconName.AttachMoney,
      testID: WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    });
  }
  if (hasBlockExplorer) {
    actions.push({
      kind: 'view-explorer',
      label: strings('asset_details.options.view_on_block'),
      iconName: IconName.ArrowSquareOut,
      testID: 'more-actions-view-explorer',
    });
  }
  if (showRemoveToken) {
    actions.push({
      kind: 'remove-token',
      label: strings('asset_details.options.remove_token'),
      iconName: IconName.Trash,
      testID: 'more-actions-remove-token',
    });
  }
  if (canDeactivate) {
    actions.push({
      kind: 'stellar-deactivate-trustline',
      label: strings('asset_details.options.deactivate_asset'),
      iconName: IconName.Trash,
      testID: 'more-actions-deactivate-asset',
      isDisabled: isDeactivating,
    });
  }
  return actions;
}

const MoreTokenActionsMenu = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<MoreTokenActionsMenuRouteProp>();
  const navigation = useNavigation<AppNavigationProp>();

  const {
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    isNativeCurrency,
    asset,
    onBuy,
    onReceive,
    onActionTapped,
  } = route.params;

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

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const goToBrowserUrl = useCallback(
    (url: string, title: string) => {
      closeBottomSheetAndNavigate(async () => {
        navigation.navigate(Routes.WALLET.HOME);

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
    [closeBottomSheetAndNavigate, navigation],
  );

  const handleBuy = useCallback(() => {
    closeBottomSheetAndNavigate(onBuy);
  }, [closeBottomSheetAndNavigate, onBuy]);

  const handleReceive = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      onReceive?.();
    });
  }, [closeBottomSheetAndNavigate, onReceive]);

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
    closeBottomSheetAndNavigate(() => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: 'AssetHideConfirmation',
        params: {
          onConfirm: async () => {
            navigation.navigate(Routes.WALLET.HOME);
            try {
              if (asset.chainId) {
                if (isNonEvmChainId(asset.chainId)) {
                  await removeNonEvmToken({
                    tokenAddress: asset.address,
                    tokenChainId: asset.chainId,
                    selectInternalAccountByScope,
                  });
                }
              }

              handleHideToken();

              const tokenSymbol = symbolOrNull(asset.symbol);

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
    closeBottomSheetAndNavigate,
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
    closeBottomSheetAndNavigate(async () => {
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
  }, [closeBottomSheetAndNavigate, deactivateAsset, navigation]);

  const tokenIsInAccount = !!useSelector((state: RootState) =>
    selectAsset(state, {
      address: asset.address,
      chainId: asset.chainId as string,
      isStaked: asset.isStaked || false,
    }),
  );

  const hasBlockExplorer = Boolean(
    explorer.getBlockExplorerName(asset.chainId),
  );
  const showRemoveToken = Boolean(
    !isNativeCurrency && tokenIsInAccount && !isMusdToken(asset.address),
  );
  const actionDescriptors = buildActionDescriptors({
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    hasOnReceive: Boolean(onReceive),
    assetSymbol: asset.symbol,
    hasBlockExplorer,
    showRemoveToken,
    canDeactivate,
    isDeactivating,
  });
  const handlers: Record<ActionKind, () => void> = {
    receive: handleReceive,
    'cash-buy': handleBuy,
    'view-explorer': handleViewOnBlockExplorer,
    'remove-token': handleRemoveToken,
    'stellar-deactivate-trustline': handleDeactivateTrustline,
  };

  return (
    <BottomSheet ref={sheetRef}>
      <Box twClassName="py-4">
        {actionDescriptors.map((config) => (
          <ActionListItem
            key={config.kind}
            label={config.label}
            iconName={config.iconName}
            onPress={handlers[config.kind]}
            testID={config.testID}
            isDisabled={config.isDisabled}
          />
        ))}
      </Box>
    </BottomSheet>
  );
};

MoreTokenActionsMenu.displayName = 'MoreTokenActionsMenu';

export default MoreTokenActionsMenu;
