// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

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

const FundActionMenu = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();

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

  const onBuy = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(...createBuyNavigationDetails());
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.BUY_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: getDecimalChainId(chainId),
        })
        .build(),
    );

    trace({
      name: TraceName.LoadRampExperience,
      tags: {
        rampType: RampType.BUY,
      },
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onSell = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(...createSellNavigationDetails());
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SELL_BUTTON_CLICKED)
        .addProperties({
          text: 'Sell',
          location: 'FundActionMenu',
          chain_id_source: getDecimalChainId(chainId),
        })
        .build(),
    );

    trace({
      name: TraceName.LoadRampExperience,
      tags: {
        rampType: RampType.SELL,
      },
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onDeposit = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.DEPOSIT.ID);
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Deposit',
          location: 'FundActionMenu',
          chain_id_destination: getDecimalChainId(chainId),
          ramp_type: 'DEPOSIT',
        })
        .build(),
    );

    trace({
      name: TraceName.LoadDepositExperience,
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    createEventBuilder,
    chainId,
  ]);

  return (
    <BottomSheet ref={sheetRef}>
      {isDepositEnabled && (
        <ActionListItem
          label="Deposit"
          description={strings('asset_overview.deposit_description')}
          iconName={IconName.Money}
          onPress={onDeposit}
          testID={WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}
        />
      )}
      {isNetworkRampSupported && (
        <ActionListItem
          label={strings('asset_overview.buy_button')}
          description={strings('asset_overview.buy_description')}
          iconName={IconName.Add}
          onPress={onBuy}
          testID={WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}
        />
      )}
      {isNetworkRampSupported && (
        <ActionListItem
          label={strings('asset_overview.sell_button')}
          description={strings('asset_overview.sell_description')}
          iconName={IconName.MinusBold}
          onPress={onSell}
          testID={WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}
          disabled={!canSignTransactions}
        />
      )}
    </BottomSheet>
  );
};

FundActionMenu.displayName = 'FundActionMenu';

export default FundActionMenu;
