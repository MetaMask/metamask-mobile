// Third party dependencies.
import React, { useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { selectChainId } from '../../../selectors/networkController';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { IconName } from '@metamask/design-system-react-native';
import ActionListItem from '../../../component-library/components-temp/ActionListItem';
import useRampNetwork from '../Ramp/Aggregator/hooks/useRampNetwork';
import { getDecimalChainId } from '../../../util/networks';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import { useMetrics } from '../../hooks/useMetrics';
import { trace, TraceName } from '../../../util/trace';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { RampType } from '../../../reducers/fiatOrders/types';
import useDepositEnabled from '../Ramp/Deposit/hooks/useDepositEnabled';
import { useRampNavigation } from '../Ramp/hooks/useRampNavigation';

// Types
import type {
  FundActionMenuRouteProp,
  ActionConfig,
} from './FundActionMenu.types';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import useRampsUnifiedV1Enabled from '../Ramp/hooks/useRampsUnifiedV1Enabled';
import { useRampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';

const FundActionMenu = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<FundActionMenuRouteProp>();

  const customOnBuy = route.params?.onBuy;
  const assetContext = route.params?.asset;

  const chainId = useSelector(selectChainId);
  const [isNetworkRampSupported] = useRampNetwork();

  const { isDepositEnabled } = useDepositEnabled();
  const { trackEvent, createEventBuilder } = useMetrics();
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const { goToBuy, goToAggregator, goToSell, goToDeposit } =
    useRampNavigation();
  const depositButtonClickData = useRampsButtonClickData();

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const createActionHandler = useCallback(
    (config: Omit<ActionConfig, 'isVisible' | 'isDisabled'>) => () => {
      closeBottomSheetAndNavigate(config.navigationAction);

      // Special handling for buy action with custom onBuy
      if (
        (config.type === 'buy' || config.type === 'buy-unified') &&
        customOnBuy
      ) {
        return; // Skip analytics for custom onBuy
      }

      trackEvent(
        createEventBuilder(config.analyticsEvent)
          .addProperties(config.analyticsProperties)
          .build(),
      );

      trace({
        name: config.traceName,
        ...config.traceProperties,
      });
    },
    [closeBottomSheetAndNavigate, trackEvent, createEventBuilder, customOnBuy],
  );

  const getChainIdForAsset = useCallback(() => {
    if (assetContext?.chainId) {
      // Safely parse chainId - if it's hex (starts with 0x), convert to decimal
      // If it's already decimal or invalid format, use as-is
      if (
        typeof assetContext.chainId === 'string' &&
        assetContext.chainId.startsWith('0x')
      ) {
        const parsed = parseInt(assetContext.chainId, 16);
        return isNaN(parsed) ? getDecimalChainId(chainId) : parsed;
      }
      // If it's already a decimal string, convert to number
      const parsed = parseInt(assetContext.chainId, 10);
      return isNaN(parsed) ? getDecimalChainId(chainId) : parsed;
    }
    return getDecimalChainId(chainId);
  }, [assetContext?.chainId, chainId]);

  const actionConfigs: ActionConfig[] = useMemo(
    () =>
      [
        {
          type: 'buy-unified',
          label: strings('fund_actionmenu.buy_unified'),
          description: strings('fund_actionmenu.buy_unified_description'),
          iconName: IconName.Add,
          testID: WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
          isVisible: rampUnifiedV1Enabled,
          analyticsEvent: MetaMetricsEvents.BUY_BUTTON_CLICKED,
          analyticsProperties: {
            text: 'Buy',
            location: 'FundActionMenu',
            chain_id_destination: getChainIdForAsset(),
            region: rampGeodetectedRegion,
          },
          navigationAction: () => {
            if (customOnBuy) {
              customOnBuy();
            } else {
              goToBuy({ assetId: assetContext?.assetId });
            }
          },
        },
        {
          type: 'deposit',
          label: strings('fund_actionmenu.deposit'),
          description: strings('fund_actionmenu.deposit_description'),
          iconName: IconName.Money,
          testID: WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
          isVisible: isDepositEnabled && !rampUnifiedV1Enabled,
          analyticsEvent: MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
          analyticsProperties: {
            text: 'Deposit',
            location: 'FundActionMenu',
            chain_id_destination: getDecimalChainId(chainId),
            ramp_type: 'DEPOSIT',
            region: rampGeodetectedRegion,
            ramp_routing: depositButtonClickData.ramp_routing,
            is_authenticated: depositButtonClickData.is_authenticated,
            preferred_provider: depositButtonClickData.preferred_provider,
            order_count: depositButtonClickData.order_count,
          },
          traceName: TraceName.LoadDepositExperience,
          navigationAction: () => goToDeposit(),
        },
        {
          type: 'buy',
          label: strings('fund_actionmenu.buy'),
          description: strings('fund_actionmenu.buy_description'),
          iconName: IconName.Add,
          testID: WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
          isVisible: !rampUnifiedV1Enabled,
          analyticsEvent: MetaMetricsEvents.BUY_BUTTON_CLICKED,
          analyticsProperties: {
            text: 'Buy',
            location: 'FundActionMenu',
            chain_id_destination: getChainIdForAsset(),
            region: rampGeodetectedRegion,
          },
          traceName: TraceName.LoadRampExperience,
          traceProperties: { tags: { rampType: RampType.BUY } },
          navigationAction: () => {
            if (customOnBuy) {
              customOnBuy();
            } else {
              goToAggregator({ assetId: assetContext?.assetId });
            }
          },
        },
        {
          type: 'sell',
          label: strings('fund_actionmenu.sell'),
          description: strings('fund_actionmenu.sell_description'),
          iconName: IconName.MinusBold,
          testID: WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
          isVisible: isNetworkRampSupported,
          isDisabled: !canSignTransactions,
          analyticsEvent: MetaMetricsEvents.SELL_BUTTON_CLICKED,
          analyticsProperties: {
            text: 'Sell',
            location: 'FundActionMenu',
            chain_id_source: getDecimalChainId(chainId),
            region: rampGeodetectedRegion,
          },
          traceName: TraceName.LoadRampExperience,
          traceProperties: { tags: { rampType: RampType.SELL } },
          navigationAction: () => goToSell({ assetId: assetContext?.assetId }),
        },
      ] as ActionConfig[],
    [
      isDepositEnabled,
      rampUnifiedV1Enabled,
      chainId,
      rampGeodetectedRegion,
      getChainIdForAsset,
      isNetworkRampSupported,
      canSignTransactions,
      customOnBuy,
      assetContext,
      goToBuy,
      goToAggregator,
      goToSell,
      goToDeposit,
      depositButtonClickData,
    ],
  );

  return (
    <BottomSheet ref={sheetRef}>
      {actionConfigs.map(
        (config) =>
          config.isVisible && (
            <ActionListItem
              key={config.type}
              label={config.label}
              description={config.description}
              iconName={config.iconName}
              onPress={createActionHandler(config)}
              testID={config.testID}
              isDisabled={config.isDisabled}
            />
          ),
      )}
    </BottomSheet>
  );
};

FundActionMenu.displayName = 'FundActionMenu';

export default FundActionMenu;
