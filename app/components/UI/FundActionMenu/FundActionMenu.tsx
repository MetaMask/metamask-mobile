// Third party dependencies.
import React, { useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';

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
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../Ramp/Aggregator/routes/utils';
import { trace, TraceName } from '../../../util/trace';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { RampType } from '../../../reducers/fiatOrders/types';
import useDepositEnabled from '../Ramp/Deposit/hooks/useDepositEnabled';
import Routes from '../../../constants/navigation/Routes';

// Types
import type {
  FundActionMenuRouteProp,
  ActionConfig,
} from './FundActionMenu.types';

const FundActionMenu = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const route = useRoute<FundActionMenuRouteProp>();

  const customOnBuy = route.params?.onBuy;
  const assetContext = route.params?.asset;

  const chainId = useSelector(selectChainId);
  const [isNetworkRampSupported] = useRampNetwork();

  const { isDepositEnabled } = useDepositEnabled();
  const { trackEvent, createEventBuilder } = useMetrics();
  const canSignTransactions = useSelector(selectCanSignTransactions);

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
      if (config.type === 'buy' && customOnBuy) {
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
          type: 'deposit',
          label: strings('fund_actionmenu.deposit'),
          description: strings('fund_actionmenu.deposit_description'),
          iconName: IconName.Money,
          testID: WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
          isVisible: isDepositEnabled,
          analyticsEvent: MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
          analyticsProperties: {
            text: 'Deposit',
            location: 'FundActionMenu',
            chain_id_destination: getDecimalChainId(chainId),
            ramp_type: 'DEPOSIT',
          },
          traceName: TraceName.LoadDepositExperience,
          navigationAction: () => navigate(Routes.DEPOSIT.ID),
        },
        {
          type: 'buy',
          label: strings('fund_actionmenu.buy'),
          description: strings('fund_actionmenu.buy_description'),
          iconName: IconName.Add,
          testID: WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
          isVisible: true,
          analyticsEvent: MetaMetricsEvents.BUY_BUTTON_CLICKED,
          analyticsProperties: {
            text: 'Buy',
            location: 'FundActionMenu',
            chain_id_destination: getChainIdForAsset(),
          },
          traceName: TraceName.LoadRampExperience,
          traceProperties: { tags: { rampType: RampType.BUY } },
          navigationAction: () => {
            if (customOnBuy) {
              customOnBuy();
            } else if (assetContext) {
              navigate(
                ...createBuyNavigationDetails({
                  address: assetContext.address,
                  chainId: getChainIdForAsset(),
                }),
              );
            } else {
              navigate(...createBuyNavigationDetails());
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
          },
          traceName: TraceName.LoadRampExperience,
          traceProperties: { tags: { rampType: RampType.SELL } },
          navigationAction: () => navigate(...createSellNavigationDetails()),
        },
      ] as ActionConfig[],
    [
      isDepositEnabled,
      isNetworkRampSupported,
      canSignTransactions,
      chainId,
      getChainIdForAsset,
      navigate,
      customOnBuy,
      assetContext,
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
