// Third party dependencies.
import React, { useRef } from 'react';
import { View, Platform } from 'react-native';
import { swapsUtils } from '@metamask/swaps-controller';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import AppConstants from '../../../core/AppConstants';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import { swapsLivenessSelector } from '../../../reducers/swaps';
import { toggleReceiveModal } from '../../../actions/modals';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Analytics from '../../../core/Analytics/Analytics';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import WalletAction from '../../../components/UI/WalletAction';
import { useStyles } from '../../../component-library/hooks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

// Internal dependencies
import styleSheet from './WalletActions.styles';
import {
  WALLET_BUY,
  WALLET_RECEIVE,
  WALLET_SEND,
  WALLET_SWAP,
} from './WalletActions.constants';
import useOnRampNetwork from '../../UI/Ramp/hooks/useOnRampNetwork';

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<SheetBottomRef>(null);
  const { navigate } = useNavigation();

  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const swapsIsLive = useSelector(swapsLivenessSelector);
  const dispatch = useDispatch();

  const [isNetworkBuySupported] = useOnRampNetwork();

  const onReceive = () => {
    sheetRef.current?.hide(() => dispatch(toggleReceiveModal()));
    Analytics.trackEventWithParameters(
      MetaMetricsEvents.RECEIVE_BUTTON_CLICKED,
      {
        text: 'Receive',
        tokenSymbol: '',
        location: 'TabBar',
        chain_id: chainId,
      },
    );
  };

  const onBuy = () => {
    sheetRef.current?.hide(() => {
      navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
      Analytics.trackEventWithParameters(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy',
        tokenSymbol: '',
        location: 'TabBar',
        chain_id: chainId,
      });
    });
  };

  const onSend = () => {
    sheetRef.current?.hide(() => {
      navigate('SendFlowView');
      ticker && dispatch(newAssetTransaction(getEther(ticker)));
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.SEND_BUTTON_CLICKED,
        {
          text: 'Send',
          tokenSymbol: '',
          location: 'TabBar',
          chain_id: chainId,
        },
      );
    });
  };

  const goToSwaps = () => {
    sheetRef.current?.hide(() => {
      navigate('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
        },
      });
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.SWAP_BUTTON_CLICKED,
        {
          text: 'Swap',
          tokenSymbol: '',
          location: 'TabBar',
          chain_id: chainId,
        },
      );
    });
  };

  return (
    <SheetBottom ref={sheetRef}>
      <View style={styles.actionsContainer}>
        {isNetworkBuySupported && (
          <WalletAction
            actionTitle={strings('asset_overview.buy_button')}
            actionDescription={strings('asset_overview.buy_description')}
            iconName={IconName.Add}
            iconSize={AvatarSize.Md}
            onPress={onBuy}
            iconStyle={styles.icon}
            {...generateTestId(Platform, WALLET_BUY)}
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
              {...generateTestId(Platform, WALLET_SWAP)}
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
          {...generateTestId(Platform, WALLET_SEND)}
        />
        <WalletAction
          actionTitle={strings('asset_overview.receive_button')}
          actionDescription={strings('asset_overview.receive_description')}
          iconName={IconName.Received}
          iconSize={AvatarSize.Md}
          onPress={onReceive}
          iconStyle={styles.icon}
          {...generateTestId(Platform, WALLET_RECEIVE)}
        />
      </View>
    </SheetBottom>
  );
};

export default WalletActions;
