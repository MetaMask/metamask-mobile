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
import { allowedToBuy } from '../../../components/UI/FiatOnRampAggregator';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { trackLegacyEvent } from '../../../util/analyticsV2';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { strings } from '../../../../locales/i18n';
import {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import WalletAction from '../../../components/UI/WalletAction';
import { useStyles } from '../../../component-library/hooks';
import generateTestId from '../../../../wdio/utils/generateTestId';

// Internal dependencies
import styleSheet from './WalletActions.styles';
import {
  WALLET_BUY,
  WALLET_RECEIVE,
  WALLET_SEND,
  WALLET_SWAP,
} from './WalletActions.constants';

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<SheetBottomRef>(null);
  const { navigate } = useNavigation();

  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const swapsIsLive = useSelector(swapsLivenessSelector);
  const dispatch = useDispatch();

  const onReceive = () => {
    sheetRef.current?.hide(() => dispatch(toggleReceiveModal()));
  };

  const onBuy = () => {
    sheetRef.current?.hide(() => {
      navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
      trackLegacyEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy',
        location: 'Wallet',
        chain_id_destination: chainId,
      });
    });
  };

  const onSend = () => {
    sheetRef.current?.hide(() => {
      navigate('SendFlowView');
      ticker && dispatch(newAssetTransaction(getEther(ticker)));
    });
  };

  const goToSwaps = () => {
    sheetRef.current?.hide(() =>
      navigate('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
        },
      }),
    );
  };

  return (
    <SheetBottom ref={sheetRef}>
      <View style={styles.actionsContainer}>
        {allowedToBuy(chainId) && (
          <WalletAction
            actionTitle={strings('asset_overview.buy_button')}
            actionDescription={strings('asset_overview.buy_description')}
            iconName={IconName.Add}
            iconSize={IconSize.Xl}
            onPress={onBuy}
            containerStyle={styles.firstActionContainer}
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
              iconSize={IconSize.Md}
              onPress={goToSwaps}
              containerStyle={
                allowedToBuy(chainId)
                  ? styles.otherActionContainer
                  : styles.firstActionContainer
              }
              {...generateTestId(Platform, WALLET_SWAP)}
            />
          )}
        <WalletAction
          actionTitle={strings('asset_overview.send_button')}
          actionDescription={strings('asset_overview.send_description')}
          iconName={IconName.Arrow2Right}
          iconSize={IconSize.Md}
          onPress={onSend}
          containerStyle={
            allowedToBuy(chainId) &&
            AppConstants.SWAPS.ACTIVE &&
            swapsIsLive &&
            isSwapsAllowed(chainId)
              ? styles.otherActionContainer
              : styles.firstActionContainer
          }
          iconStyle={{ transform: [{ rotate: '-45deg' }] }}
          {...generateTestId(Platform, WALLET_SEND)}
        />
        <WalletAction
          actionTitle={strings('asset_overview.receive_button')}
          actionDescription={strings('asset_overview.receive_description')}
          iconName={IconName.Received}
          iconSize={IconSize.Md}
          onPress={onReceive}
          containerStyle={styles.otherActionContainer}
          {...generateTestId(Platform, WALLET_RECEIVE)}
        />
      </View>
    </SheetBottom>
  );
};

export default WalletActions;
