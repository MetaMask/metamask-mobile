// Third party dependencies.
import React, { useRef } from 'react';
import { View, Platform } from 'react-native';
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
import { toggleReceiveModal } from '../../../actions/modals';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import isBridgeAllowed from '../../UI/Bridge/utils/isBridgeAllowed';
import useGoToBridge from '../../../components/UI/Bridge/utils/useGoToBridge';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import WalletAction from '../../../components/UI/WalletAction';
import { useStyles } from '../../../component-library/hooks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import useRampNetwork from '../../UI/Ramp/hooks/useRampNetwork';
import ImportedEngine from '../../../core/Engine';
import { getDecimalChainId } from '../../../util/networks';

// Internal dependencies
import styleSheet from './WalletActions.styles';
import {
  WALLET_BRIDGE,
  WALLET_BUY,
  WALLET_RECEIVE,
  WALLET_SELL,
  WALLET_SEND,
  WALLET_SWAP,
} from './WalletActions.constants';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
import { getPermittedAccounts } from '../../../core/Permissions';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';

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
    sheetRef.current?.onCloseBottomSheet(() => dispatch(toggleReceiveModal()));
    trackEvent(MetaMetricsEvents.RECEIVE_BUTTON_CLICKED, {
      text: 'Receive',
      tokenSymbol: '',
      location: 'TabBar',
      chain_id: getDecimalChainId(chainId),
    });
  };

  const onBuy = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(Routes.RAMP.BUY);
      trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy',
        location: 'TabBar',
        chain_id_destination: getDecimalChainId(chainId),
      });
    });
  };

  const onSell = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(Routes.RAMP.SELL);
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

  const onCheckPermissions = async () => {
    DevLogger.log(`Checking permissions now...`);
    const Engine = ImportedEngine as any;
    try {
      // const hostname = 'sdk://19a02b89-1e4d-4aa6-9000-d3b8bd082ef3';

      // await Engine.context.ApprovalController.clear();
      // await Engine.context.PermissionController.requestPermissions(
      //   { origin: hostname },
      //   { eth_accounts: {} },
      //   { id: random() },
      // );
      const permissionController = Engine.context
        .PermissionController as PermissionController<any, any>;
      DevLogger.log(`perm`, permissionController);
      const acc = await getPermittedAccounts(
        '7704bea0f5d4533548cfcfc022b77e50ee02519e79bb1adbe179e47d2d75ab73',
      );
      DevLogger.log(`Permissions: ${JSON.stringify(acc)}`);
    } catch (error) {
      console.error(`Error checking permissions`, error);
    }
  };

  const simulateSDK = async () => {
    DevLogger.log(`Simulating SDK now...`);
    try {
      const id = '19a02b89-1e4d-4aa6-9000-d3b8bd082ef3';
      const origin = AppConstants.DEEPLINKS.ORIGIN_QR_CODE;
      SDKConnect.getInstance().connectToChannel({
        id,
        origin,
        trigger: 'deeplink',
        otherPublicKey: '0x1234567890123456789012345678901234567890',
      });
    } catch (error) {
      console.error(`Error simulating SDK`, error);
    }
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        <WalletAction
          actionTitle="Debug"
          actionDescription="Check Permissions"
          iconName={IconName.Add}
          iconSize={AvatarSize.Md}
          onPress={onCheckPermissions}
          iconStyle={styles.icon}
          {...generateTestId(Platform, WALLET_BUY)}
        />
        <WalletAction
          actionTitle="Debug"
          actionDescription="Simulate SDK"
          iconName={IconName.Add}
          iconSize={AvatarSize.Md}
          onPress={simulateSDK}
          iconStyle={styles.icon}
          {...generateTestId(Platform, WALLET_BUY)}
        />
        {isNetworkRampSupported && (
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

        {isNetworkRampSupported && (
          <WalletAction
            actionTitle={strings('asset_overview.sell_button')}
            actionDescription={strings('asset_overview.sell_description')}
            iconName={IconName.Minus}
            iconSize={AvatarSize.Md}
            onPress={onSell}
            iconStyle={styles.icon}
            {...generateTestId(Platform, WALLET_SELL)}
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

        {isBridgeAllowed(chainId) && (
          <WalletAction
            actionTitle={strings('asset_overview.bridge')}
            actionDescription={strings('asset_overview.bridge_description')}
            iconName={IconName.Bridge}
            iconSize={AvatarSize.Md}
            onPress={goToBridge}
            iconStyle={styles.icon}
            {...generateTestId(Platform, WALLET_BRIDGE)}
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
    </BottomSheet>
  );
};

export default WalletActions;
