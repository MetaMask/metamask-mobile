// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';
import { swapsUtils } from '@metamask/swaps-controller';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import AppConstants from '../../../core/AppConstants';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import { swapsLivenessSelector } from '../../../reducers/swaps';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import isBridgeAllowed from '../../UI/Bridge/utils/isBridgeAllowed';
import useGoToBridge from '../../../components/UI/Bridge/utils/useGoToBridge';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import WalletAction from '../../../components/UI/WalletAction';
import { useStyles } from '../../../component-library/hooks';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import useRampNetwork from '../../UI/Ramp/hooks/useRampNetwork';
import { getDecimalChainId } from '../../../util/networks';
import { WalletActionsModalSelectorsIDs } from '../../../../e2e/selectors/Modals/WalletActionsModal.selectors';

// Internal dependencies
import styleSheet from './WalletActions.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { Screens } from '../QRTabSwitcher';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../../UI/Ramp/routes/utils';

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const goToBridge = useGoToBridge('TabBar');

  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const swapsIsLive = useSelector(swapsLivenessSelector);
  const dispatch = useDispatch();

  const [isNetworkRampSupported] = useRampNetwork();
  const { trackEvent } = useMetrics();

  const onReceive = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(Routes.QR_TAB_SWITCHER, {
        initialScreen: Screens.Receive,
      });
    });

    trackEvent(MetaMetricsEvents.RECEIVE_BUTTON_CLICKED, {
      text: 'Receive',
      tokenSymbol: '',
      location: 'TabBar',
      chain_id: getDecimalChainId(chainId),
    });
  };

  const onBuy = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(...createBuyNavigationDetails());
      trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy',
        location: 'TabBar',
        chain_id_destination: getDecimalChainId(chainId),
      });
    });
  };

  const onSell = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(...createSellNavigationDetails());
      trackEvent(MetaMetricsEvents.SELL_BUTTON_CLICKED, {
        text: 'Sell',
        location: 'TabBar',
        chain_id_source: getDecimalChainId(chainId),
      });
    });
  };
  const onSend = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate('SendFlowView');
      ticker && dispatch(newAssetTransaction(getEther(ticker)));
      trackEvent(MetaMetricsEvents.SEND_BUTTON_CLICKED, {
        text: 'Send',
        tokenSymbol: '',
        location: 'TabBar',
        chain_id: getDecimalChainId(chainId),
      });
    });
  };

  const goToSwaps = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
          sourcePage: 'MainView',
        },
      });
      trackEvent(MetaMetricsEvents.SWAP_BUTTON_CLICKED, {
        text: 'Swap',
        tokenSymbol: '',
        location: 'TabBar',
        chain_id: getDecimalChainId(chainId),
      });
    });
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        {isNetworkRampSupported && (
          <WalletAction
            actionTitle={strings('asset_overview.buy_button')}
            actionDescription={strings('asset_overview.buy_description')}
            iconName={IconName.Add}
            iconSize={AvatarSize.Md}
            onPress={onBuy}
            iconStyle={styles.icon}
            actionID={WalletActionsModalSelectorsIDs.BUY_BUTTON}
          />
        )}

        {isNetworkRampSupported && (
          <WalletAction
            actionTitle={strings('asset_overview.sell_button')}
            actionDescription={strings('asset_overview.sell_description')}
            iconName={IconName.MinusBold}
            iconSize={AvatarSize.Md}
            onPress={onSell}
            iconStyle={styles.icon}
            actionID={WalletActionsModalSelectorsIDs.SELL_BUTTON}
          />
        )}

        {AppConstants.SWAPS.ACTIVE &&
          swapsIsLive &&
          isSwapsAllowed(chainId) && (
            <WalletAction
              actionTitle={strings('asset_overview.swap')}
              actionDescription={strings('asset_overview.swap_description')}
              iconName={IconName.SwapHorizontal}
              iconSize={AvatarSize.Md}
              onPress={goToSwaps}
              iconStyle={styles.icon}
              actionID={WalletActionsModalSelectorsIDs.SWAP_BUTTON}
            />
          )}

        {isBridgeAllowed(chainId) && (
          <WalletAction
            actionTitle={strings('asset_overview.bridge')}
            actionDescription={strings('asset_overview.bridge_description')}
            iconName={IconName.Bridge}
            iconSize={AvatarSize.Md}
            onPress={goToBridge}
            iconStyle={styles.icon}
            actionID={WalletActionsModalSelectorsIDs.BRIDGE_BUTTON}
          />
        )}
        <WalletAction
          actionTitle={strings('asset_overview.send_button')}
          actionDescription={strings('asset_overview.send_description')}
          iconName={IconName.Arrow2Right}
          iconSize={AvatarSize.Md}
          onPress={onSend}
          iconStyle={{
            transform: [{ rotate: '-45deg' }],
            ...styles.icon,
          }}
          actionID={WalletActionsModalSelectorsIDs.SEND_BUTTON}
        />
        <WalletAction
          actionTitle={strings('asset_overview.receive_button')}
          actionDescription={strings('asset_overview.receive_description')}
          iconName={IconName.Received}
          iconSize={AvatarSize.Md}
          onPress={onReceive}
          iconStyle={styles.icon}
          actionID={WalletActionsModalSelectorsIDs.RECEIVE_BUTTON}
        />
      </View>
    </BottomSheet>
  );
};

export default WalletActions;
