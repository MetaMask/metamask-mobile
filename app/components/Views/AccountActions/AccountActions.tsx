// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import { useStyles } from '../../../component-library/hooks';
import AccountAction from '../AccountAction/AccountAction';
import {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
// Internal dependencies
import styleSheet from './AccountActions.styles';
import { findBlockExplorerForRpc } from '../../../util/networks';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../util/etherscan';
import { Analytics, MetaMetricsEvents } from '../../../core/Analytics';
import { RPC } from '../../../constants/network';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';

const AccountActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<SheetBottomRef>(null);
  const { navigate } = useNavigation();

  const providerConfig = useSelector(selectProviderConfig);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const goToBrowserUrl = (url, title) => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const viewInEtherscan = () => {
    if (providerConfig?.rpcTarget && providerConfig.type === RPC) {
      const blockExplorer = findBlockExplorerForRpc(
        providerConfig.rpcTarget,
        frequentRpcList,
      );
      const url = `${blockExplorer}/address/${selectedAddress}`;
      const title = new URL(blockExplorer).hostname;
      goToBrowserUrl(url, title);
    } else {
      const url = getEtherscanAddressUrl(providerConfig.type, selectedAddress);
      const etherscan_url = getEtherscanBaseUrl(providerConfig.type).replace(
        'https://',
        '',
      );
      goToBrowserUrl(url, etherscan_url);
    }
    Analytics.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_VIEW_ETHERSCAN);
  };

  return (
    <SheetBottom ref={sheetRef}>
      <View style={styles.actionsContainer}>
        <AccountAction
          actionTitle={'Edit account name'}
          iconName={IconName.Edit}
          iconSize={IconSize.Md}
          onPress={() => null}
          iconStyle={styles.icon}
        />
        <AccountAction
          actionTitle={'View on Etherscan'}
          iconName={IconName.Export}
          iconSize={IconSize.Md}
          onPress={() => null}
          iconStyle={styles.icon}
        />
        <AccountAction
          actionTitle={'Share my public address'}
          iconName={IconName.Export}
          iconSize={IconSize.Md}
          onPress={() => null}
          iconStyle={styles.icon}
        />
        <AccountAction
          actionTitle={'Show private key'}
          iconName={IconName.Key}
          iconSize={IconSize.Md}
          onPress={() => null}
          iconStyle={styles.icon}
        />
      </View>
    </SheetBottom>
  );
};

export default AccountActions;
