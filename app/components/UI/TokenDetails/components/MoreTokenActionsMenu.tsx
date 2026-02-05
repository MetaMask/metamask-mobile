import React, { useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { IconName, Box } from '@metamask/design-system-react-native';
import ActionListItem from '../../../../component-library/components-temp/ActionListItem';
import { strings } from '../../../../../locales/i18n';
import { useMetrics } from '../../../hooks/useMetrics';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import useRampsUnifiedV1Enabled from '../../Ramp/hooks/useRampsUnifiedV1Enabled';
import { useRampsButtonClickData } from '../../Ramp/hooks/useRampsButtonClickData';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import NotificationManager from '../../../../core/NotificationManager';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { trace, TraceName } from '../../../../util/trace';
import { RampType } from '../../../../reducers/fiatOrders/types';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../Views/WalletActions/WalletActionsBottomSheet.testIds';
import Logger from '../../../../util/Logger';
import { Hex } from '@metamask/utils';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { TokenI } from '../../Tokens/types';

export interface MoreTokenActionsMenuParams {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  isNativeCurrency: boolean;
  asset: TokenI;
  onBuy?: () => void;
  onReceive?: () => void;
}

type MoreTokenActionsMenuRouteProp = RouteProp<
  { MoreTokenActionsMenu: MoreTokenActionsMenuParams },
  'MoreTokenActionsMenu'
>;

interface ActionConfig {
  type: string;
  label: string;
  description?: string;
  iconName: IconName;
  testID: string;
  isVisible: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}

const MoreTokenActionsMenu = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<MoreTokenActionsMenuRouteProp>();
  const navigation = useNavigation();

  const {
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    isNativeCurrency,
    asset,
    onBuy: customOnBuy,
    onReceive,
  } = route.params;

  const { trackEvent, createEventBuilder } = useMetrics();
  const { goToBuy, goToAggregator } = useRampNavigation();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const rampsButtonClickData = useRampsButtonClickData();
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  const tokenList = useSelector(selectTokenList);
  const chainId = useSelector(selectChainId);
  const explorer = useBlockExplorer(asset.chainId);

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const goToBrowserUrl = useCallback(
    (url: string, title: string) => {
      closeBottomSheetAndNavigate(async () => {
        if (await InAppBrowser.isAvailable()) {
          await InAppBrowser.open(url);
        } else {
          navigation.navigate('Webview', {
            screen: 'SimpleWebview',
            params: { url, title },
          });
        }
      });
    },
    [closeBottomSheetAndNavigate, navigation],
  );

  const getChainIdForAsset = useCallback(() => {
    if (asset.chainId) {
      if (typeof asset.chainId === 'string' && asset.chainId.startsWith('0x')) {
        const parsed = parseInt(asset.chainId, 16);
        return isNaN(parsed) ? getDecimalChainId(chainId) : parsed;
      }
      const parsed = parseInt(asset.chainId, 10);
      return isNaN(parsed) ? getDecimalChainId(chainId) : parsed;
    }
    return getDecimalChainId(chainId);
  }, [asset.chainId, chainId]);

  // Fund action handlers (same as FundActionMenu)
  const handleBuyUnified = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      if (customOnBuy) {
        customOnBuy();
      } else {
        goToBuy({ assetId: asset.address });
      }
    });

    if (!customOnBuy) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
          .addProperties({
            text: 'Buy',
            location: 'MoreTokenActionsMenu',
            chain_id_destination: getChainIdForAsset(),
            ramp_type: 'UNIFIED_BUY',
            region: rampGeodetectedRegion,
            ramp_routing: rampsButtonClickData.ramp_routing,
            is_authenticated: rampsButtonClickData.is_authenticated,
            preferred_provider: rampsButtonClickData.preferred_provider,
            order_count: rampsButtonClickData.order_count,
          })
          .build(),
      );
    }
  }, [
    closeBottomSheetAndNavigate,
    customOnBuy,
    goToBuy,
    asset.address,
    trackEvent,
    createEventBuilder,
    getChainIdForAsset,
    rampGeodetectedRegion,
    rampsButtonClickData,
  ]);

  const handleBuy = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      if (customOnBuy) {
        customOnBuy();
      } else {
        goToAggregator({ assetId: asset.address });
      }
    });

    if (!customOnBuy) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
          .addProperties({
            text: 'Buy',
            location: 'MoreTokenActionsMenu',
            chain_id_destination: getChainIdForAsset(),
            ramp_type: 'BUY',
            region: rampGeodetectedRegion,
            ramp_routing: rampsButtonClickData.ramp_routing,
            is_authenticated: rampsButtonClickData.is_authenticated,
            preferred_provider: rampsButtonClickData.preferred_provider,
            order_count: rampsButtonClickData.order_count,
          })
          .build(),
      );

      trace({
        name: TraceName.LoadRampExperience,
        tags: { rampType: RampType.BUY },
      });
    }
  }, [
    closeBottomSheetAndNavigate,
    customOnBuy,
    goToAggregator,
    asset.address,
    trackEvent,
    createEventBuilder,
    getChainIdForAsset,
    rampGeodetectedRegion,
    rampsButtonClickData,
  ]);

  const handleReceive = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      onReceive?.();
    });
  }, [closeBottomSheetAndNavigate, onReceive]);

  const handleViewOnBlockExplorer = useCallback(() => {
    const url = isNativeCurrency
      ? explorer.getBlockExplorerBaseUrl(asset.chainId)
      : explorer.getBlockExplorerUrl(asset.address, asset.chainId);

    if (url) {
      goToBrowserUrl(url, explorer.getBlockExplorerName(asset.chainId));
    }
  }, [
    isNativeCurrency,
    explorer,
    asset.chainId,
    asset.address,
    goToBrowserUrl,
  ]);

  const handleRemoveToken = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: 'AssetHideConfirmation',
        params: {
          onConfirm: () => {
            navigation.navigate('WalletView');
            try {
              const { TokensController, NetworkController } = Engine.context;
              const networkClientId =
                NetworkController.findNetworkClientIdByChainId(
                  asset.chainId as Hex,
                );
              TokensController.ignoreTokens([asset.address], networkClientId);

              const tokenSymbol =
                tokenList[asset.address?.toLowerCase()]?.symbol || null;

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
                    chain_id: getDecimalChainId(chainId),
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
    tokenList,
    trackEvent,
    createEventBuilder,
    chainId,
  ]);

  const actionConfigs: ActionConfig[] = useMemo(() => {
    const actions: ActionConfig[] = [];

    // Show receive option when perps market is active and has balance
    // (Receive button not shown in main actions in this case)
    if (hasPerpsMarket && hasBalance && onReceive) {
      actions.push({
        type: 'receive',
        label: strings('asset_overview.receive_button'),
        iconName: IconName.QrCode,
        testID: 'more-actions-receive',
        isVisible: true,
        onPress: handleReceive,
      });
    }

    // Show Cash buy option when perps market is active (Cash Buy button not shown in main actions)
    if (hasPerpsMarket && isBuyable) {
      actions.push({
        type: 'cash-buy',
        label: `Cash buy ${asset.symbol}`,
        iconName: IconName.AttachMoney,
        testID: WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
        isVisible: true,
        onPress: rampUnifiedV1Enabled ? handleBuyUnified : handleBuy,
      });
    }

    // View on block explorer
    if (explorer.getBlockExplorerName(asset.chainId)) {
      actions.push({
        type: 'view-explorer',
        label: strings('asset_details.options.view_on_block'),
        iconName: IconName.Export,
        testID: 'more-actions-view-explorer',
        isVisible: true,
        onPress: handleViewOnBlockExplorer,
      });
    }

    // Remove token (only for non-native tokens)
    if (!isNativeCurrency) {
      actions.push({
        type: 'remove-token',
        label: strings('asset_details.options.remove_token'),
        iconName: IconName.Trash,
        testID: 'more-actions-remove-token',
        isVisible: true,
        onPress: handleRemoveToken,
      });
    }

    return actions;
  }, [
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    isNativeCurrency,
    asset.chainId,
    asset.symbol,
    explorer,
    rampUnifiedV1Enabled,
    onReceive,
    handleReceive,
    handleBuyUnified,
    handleBuy,
    handleViewOnBlockExplorer,
    handleRemoveToken,
  ]);

  return (
    <BottomSheet ref={sheetRef}>
      <Box twClassName="py-4">
        {actionConfigs.map(
          (config) =>
            config.isVisible && (
              <ActionListItem
                key={config.type}
                label={config.label}
                description={config.description}
                iconName={config.iconName}
                onPress={config.onPress}
                testID={config.testID}
                isDisabled={config.isDisabled}
              />
            ),
        )}
      </Box>
    </BottomSheet>
  );
};

MoreTokenActionsMenu.displayName = 'MoreTokenActionsMenu';

export default MoreTokenActionsMenu;
