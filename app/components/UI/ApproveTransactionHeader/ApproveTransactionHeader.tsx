import { toChecksumAddress } from 'ethereumjs-util';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import AppConstants from '../../../../app/core/AppConstants';
import { strings } from '../../../../locales/i18n';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import { useStyles } from '../../../component-library/hooks';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectIdentities } from '../../../selectors/preferencesController';
import {
  renderAccountName,
  renderShortAddress,
  getLabelTextByAddress,
} from '../../../util/address';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import {
  getNetworkImageSource,
  getNetworkNameFromProviderConfig,
} from '../../../util/networks';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import useAddressBalance from '../../hooks/useAddressBalance/useAddressBalance';
import {
  ORIGIN_DEEPLINK,
  ORIGIN_QR_CODE,
} from './ApproveTransactionHeader.constants';
import stylesheet from './ApproveTransactionHeader.styles';
import { ApproveTransactionHeaderI } from './ApproveTransactionHeader.types';
import useFavicon from '../../hooks/useFavicon/useFavicon';

const ApproveTransactionHeader = ({
  from,
  origin,
  url,
  currentEnsName,
  asset,
  dontWatchAsset,
}: ApproveTransactionHeaderI) => {
  const [accountName, setAccountName] = useState('');

  const [isOriginDeepLink, setIsOriginDeepLink] = useState(false);
  const [isOriginWalletConnect, setIsOriginWalletConnect] = useState(false);
  const [isOriginMMSDKRemoteConn, setIsOriginMMSDKRemoteConn] = useState(false);

  const { styles } = useStyles(stylesheet, {});
  const { addressBalance } = useAddressBalance(asset, from, dontWatchAsset);

  const accounts = useSelector(selectAccounts);

  const identities = useSelector(selectIdentities);
  const activeAddress = toChecksumAddress(from);

  const providerConfig = useSelector(selectProviderConfig);
  const networkName = getNetworkNameFromProviderConfig(providerConfig);

  const useBlockieIcon = useSelector(
    (state: any) => state.settings.useBlockieIcon,
  );

  useEffect(() => {
    const accountNameVal = activeAddress
      ? renderAccountName(activeAddress, identities)
      : '';

    const isOriginDeepLinkVal =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;
    const isOriginWalletConnectVal = origin?.startsWith(WALLET_CONNECT_ORIGIN);

    const isOriginMMSDKRemoteConnVal = origin?.startsWith(
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
    );

    setAccountName(accountNameVal);
    setIsOriginDeepLink(isOriginDeepLinkVal);
    setIsOriginWalletConnect(isOriginWalletConnectVal);
    setIsOriginMMSDKRemoteConn(isOriginMMSDKRemoteConnVal);
  }, [accounts, identities, activeAddress, origin]);

  const networkImage = getNetworkImageSource({
    networkType: providerConfig.type,
    chainId: providerConfig.chainId,
  });

  const domainTitle = useMemo(() => {
    let title = '';
    if (isOriginDeepLink) {
      title = renderShortAddress(from);
    } else if (isOriginWalletConnect) {
      title = getUrlObj(origin.split(WALLET_CONNECT_ORIGIN)[1]).origin;
    } else if (isOriginMMSDKRemoteConn) {
      title = getUrlObj(
        origin.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1],
      ).origin;
    } else {
      title = prefixUrlWithProtocol(currentEnsName || origin || url);
    }

    return title;
  }, [
    currentEnsName,
    origin,
    isOriginDeepLink,
    isOriginWalletConnect,
    isOriginMMSDKRemoteConn,
    from,
    url,
  ]);

  const faviconUpdatedOrigin = useMemo(() => {
    let newOrigin = origin;
    if (isOriginWalletConnect) {
      newOrigin = origin.split(WALLET_CONNECT_ORIGIN)[1];
    } else if (isOriginMMSDKRemoteConn) {
      newOrigin = origin.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1];
    }
    return newOrigin;
  }, [origin, isOriginWalletConnect, isOriginMMSDKRemoteConn]);

  const faviconSource = useFavicon(faviconUpdatedOrigin);

  const accountTypeLabel = getLabelTextByAddress(activeAddress);

  return (
    <View style={styles.transactionHeader}>
      {origin ? (
        <TagUrl
          imageSource={faviconSource}
          label={domainTitle}
          style={styles.tagUrl}
        />
      ) : null}
      <AccountBalance
        accountAddress={activeAddress}
        accountTokenBalance={addressBalance}
        accountName={accountName}
        accountBalanceLabel={strings('transaction.balance')}
        accountTypeLabel={accountTypeLabel}
        accountNetwork={networkName}
        badgeProps={{
          variant: BadgeVariant.Network,
          name: networkName,
          imageSource: networkImage,
        }}
        useBlockieIcon={useBlockieIcon}
      />
    </View>
  );
};

export default ApproveTransactionHeader;
