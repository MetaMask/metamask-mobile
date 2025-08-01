// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { selectChainId } from '../../../../selectors/networkController';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import WalletAction from '../../../../components/UI/WalletAction';
import { useStyles } from '../../../../component-library/hooks';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import useRampNetwork from '../../../UI/Ramp/Aggregator/hooks/useRampNetwork';
import { getDecimalChainId } from '../../../../util/networks';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';

// Internal dependencies
import styleSheet from './AssetDetailsActionsBottomSheet.styles';
import { useMetrics } from '../../../hooks/useMetrics';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../../../UI/Ramp/Aggregator/routes/utils';
import { trace, TraceName } from '../../../../util/trace';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import { WalletActionType } from '../../../UI/WalletAction/WalletAction.types';
import { RampType } from '../../../../reducers/fiatOrders/types';
import useDepositEnabled from '../../../UI/Ramp/Deposit/hooks/useDepositEnabled';
import Routes from '../../../../constants/navigation/Routes';

const AssetDetailsActionsBottomSheet = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();

  const chainId = useSelector(selectChainId);
  const dispatch = useDispatch();
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
          location: 'AssetDetailsActions',
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
          location: 'AssetDetailsActions',
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
          location: 'AssetDetailsActions',
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
      <View style={styles.actionsContainer}>
        {isDepositEnabled && (
          <WalletAction
            actionType={WalletActionType.Deposit}
            iconName={IconName.Cash}
            onPress={onDeposit}
            actionID={WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
          />
        )}
        {isNetworkRampSupported && (
          <WalletAction
            actionType={WalletActionType.Buy}
            iconName={IconName.Add}
            onPress={onBuy}
            actionID={WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
          />
        )}
        {isNetworkRampSupported && (
          <WalletAction
            actionType={WalletActionType.Sell}
            iconName={IconName.MinusBold}
            onPress={onSell}
            actionID={WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions}
          />
        )}
      </View>
    </BottomSheet>
  );
};

AssetDetailsActionsBottomSheet.displayName = 'AssetDetailsActionsBottomSheet';

export default AssetDetailsActionsBottomSheet;
