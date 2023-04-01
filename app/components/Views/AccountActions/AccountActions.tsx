// Third party dependencies.
import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Share from 'react-native-share';

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
import { findBlockExplorerForRpc } from '../../../util/networks';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../util/etherscan';
import { Analytics, MetaMetricsEvents } from '../../../core/Analytics';
import { RPC } from '../../../constants/network';
import { selectProviderConfig } from '../../../selectors/networkController';
// Internal dependencies
import styleSheet from './AccountActions.styles';
import Logger from '../../../util/Logger';
import { protectWalletModalVisible } from '../../../actions/user';
import AnalyticsV2 from '../../../util/analyticsV2';
import Routes from '../../../constants/navigation/Routes';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  EDIT_ACCOUNT,
  SHARE_ADDRESS,
  SHOW_PRIVATE_KEY,
  VIEW_ETHERSCAN,
} from './AccountActions.constants';

const AccountActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<SheetBottomRef>(null);
  const { navigate } = useNavigation();
  const dispatch = useDispatch();

  const providerConfig = useSelector(selectProviderConfig);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const goToBrowserUrl = (url: string, title: string) => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const viewInEtherscan = () => {
    sheetRef.current?.hide(() => {
      if (providerConfig?.rpcTarget && providerConfig.type === RPC) {
        const blockExplorer = findBlockExplorerForRpc(
          providerConfig.rpcTarget,
          frequentRpcList,
        );
        const url = `${blockExplorer}/address/${selectedAddress}`;
        const title = new URL(blockExplorer).hostname;
        goToBrowserUrl(url, title);
      } else {
        const url = getEtherscanAddressUrl(
          providerConfig.type,
          selectedAddress,
        );
        const etherscan_url = getEtherscanBaseUrl(providerConfig.type).replace(
          'https://',
          '',
        );
        goToBrowserUrl(url, etherscan_url);
      }

      Analytics.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_VIEW_ETHERSCAN);
    });
  };

  const onShare = () => {
    sheetRef.current?.hide(() => {
      Share.open({
        message: selectedAddress,
      })
        .then(() => {
          dispatch(protectWalletModalVisible());
        })
        .catch((err) => {
          Logger.log('Error while trying to share address', err);
        });

      Analytics.trackEvent(
        MetaMetricsEvents.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS,
      );
    });
  };

  const goToExportPrivateKey = () => {
    sheetRef.current?.hide(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.REVEAL_PRIVATE_KEY_INITIATED,
        {},
      );

      navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
        credentialName: 'private_key',
        shouldUpdateNav: true,
      });
    });
  };

  return (
    <SheetBottom ref={sheetRef}>
      <View style={styles.actionsContainer}>
        <AccountAction
          actionTitle={'Edit account name'}
          iconName={IconName.Edit}
          iconSize={IconSize.Md}
          // This action will be address on other PR
          onPress={() => null}
          iconStyle={styles.icon}
          {...generateTestId(Platform, EDIT_ACCOUNT)}
        />
        <AccountAction
          actionTitle={'View on Etherscan'}
          iconName={IconName.Export}
          iconSize={IconSize.Md}
          onPress={viewInEtherscan}
          iconStyle={styles.icon}
          {...generateTestId(Platform, VIEW_ETHERSCAN)}
        />
        <AccountAction
          actionTitle={'Share my public address'}
          iconName={IconName.Share}
          iconSize={IconSize.Md}
          onPress={onShare}
          iconStyle={styles.icon}
          {...generateTestId(Platform, SHARE_ADDRESS)}
        />
        <AccountAction
          actionTitle={'Show private key'}
          iconName={IconName.Key}
          iconSize={IconSize.Md}
          onPress={goToExportPrivateKey}
          iconStyle={styles.icon}
          {...generateTestId(Platform, SHOW_PRIVATE_KEY)}
        />
      </View>
    </SheetBottom>
  );
};

export default AccountActions;
