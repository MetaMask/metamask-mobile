// Third party dependencies.
import React, { useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Share from 'react-native-share';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../component-library/hooks';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../util/networks';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../util/etherscan';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { RPC } from '../../../constants/network';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import styleSheet from './AccountActions.styles';
import Logger from '../../../util/Logger';
import { protectWalletModalVisible } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  EDIT_ACCOUNT,
  SHARE_ADDRESS,
  SHOW_PRIVATE_KEY,
  VIEW_ETHERSCAN,
} from './AccountActions.constants';
import { useMetrics } from '../../../components/hooks/useMetrics';

const AccountActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent } = useMetrics();

  const providerConfig = useSelector(selectProviderConfig);

  const selectedAddress = useSelector(selectSelectedAddress);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const blockExplorer = useMemo(() => {
    if (providerConfig?.rpcUrl && providerConfig.type === RPC) {
      return findBlockExplorerForRpc(
        providerConfig.rpcUrl,
        networkConfigurations,
      );
    }
    return null;
  }, [networkConfigurations, providerConfig.rpcUrl, providerConfig.type]);

  const blockExplorerName = getBlockExplorerName(blockExplorer);

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
    sheetRef.current?.onCloseBottomSheet(() => {
      if (blockExplorer) {
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

      trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_VIEW_ETHERSCAN);
    });
  };

  const onShare = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      Share.open({
        message: selectedAddress,
      })
        .then(() => {
          dispatch(protectWalletModalVisible());
        })
        .catch((err) => {
          Logger.log('Error while trying to share address', err);
        });

      trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS);
    });
  };

  const goToExportPrivateKey = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      trackEvent(MetaMetricsEvents.REVEAL_PRIVATE_KEY_INITIATED);

      navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
        credentialName: 'private_key',
        shouldUpdateNav: true,
      });
    });
  };

  const goToEditAccountName = () => {
    navigate('EditAccountName');
  };

  const isExplorerVisible = Boolean(
    (providerConfig.type === 'rpc' && blockExplorer) ||
      providerConfig.type !== 'rpc',
  );

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        <AccountAction
          actionTitle={strings('account_actions.edit_name')}
          iconName={IconName.Edit}
          onPress={goToEditAccountName}
          {...generateTestId(Platform, EDIT_ACCOUNT)}
        />
        {isExplorerVisible && (
          <AccountAction
            actionTitle={
              (blockExplorer &&
                `${strings('drawer.view_in')} ${blockExplorerName}`) ||
              strings('drawer.view_in_etherscan')
            }
            iconName={IconName.Export}
            onPress={viewInEtherscan}
            {...generateTestId(Platform, VIEW_ETHERSCAN)}
          />
        )}
        <AccountAction
          actionTitle={strings('drawer.share_address')}
          iconName={IconName.Share}
          onPress={onShare}
          {...generateTestId(Platform, SHARE_ADDRESS)}
        />
        <AccountAction
          actionTitle={strings('account_details.show_private_key')}
          iconName={IconName.Key}
          onPress={goToExportPrivateKey}
          {...generateTestId(Platform, SHOW_PRIVATE_KEY)}
        />
      </View>
    </BottomSheet>
  );
};

export default AccountActions;
