import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { getHost } from '../../../util/browser';
import { useSelector } from 'react-redux';
import networkList, { isMainnetByChainId } from '../../../util/networks';

import { renderShortAddress, renderAccountName } from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';
import { renderFromWei, hexToBN } from '../../../util/number';
import { getTicker } from '../../../util/transactions';
import getImage from '../../../util/getImage';
import { TEST_REMOTE_IMAGE_SOURCE } from '../../../component-library/components-temp/Accounts/AccountBalance/AccountBalance.constants';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';

import { BadgeVariants } from '../../../component-library/components/Badges/Badge/Badge.types';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import stylesheet from './ApproveTransactionHeader.styles';
import {
  FAV_ICON_URL,
  MAX_DOMAIN_TITLE_LENGTH,
  ORIGIN_DEEPLINK,
  ORIGIN_QR_CODE,
} from './ApproveTransactionHeader.constants';
import {
  AccountInfoI,
  ApproveTransactionHeaderI,
  OriginsI,
} from './ApproveTransactionHeader.types';
import images from 'images/image-icons';
import TagUrl from '../../../component-library/components/Tags/TagUrl';

const ApproveTransactionHeader = ({
  spenderAddress,
  origin,
  url,
  currentEnsName,
}: ApproveTransactionHeaderI) => {
  const [accountInfo, setAccountInfo] = useState<AccountInfoI>({
    balance: 0,
    currency: '',
    accountName: '',
    networkName: '',
  });
  const [origins, setOrigins] = useState<OriginsI>({
    isOriginDeepLink: false,
    isOriginWalletConnect: false,
    isOriginMMSDKRemoteConn: false,
  });

  const { styles } = useStyles(stylesheet, {});

  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const network = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );

  useEffect(() => {
    const { ticker, type } = network;
    const weiBalance = selectedAddress
      ? hexToBN(accounts[selectedAddress].balance)
      : 0;

    const balance = Number(renderFromWei(weiBalance));
    const currency = getTicker(ticker);
    const accountName = selectedAddress
      ? renderAccountName(selectedAddress, identities)
      : '';

    const isOriginDeepLink =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;
    const isOriginWalletConnect = origin?.startsWith(WALLET_CONNECT_ORIGIN);

    const isOriginMMSDKRemoteConn = origin?.startsWith(MM_SDK_REMOTE_ORIGIN);

    const networkName = networkList[type as keyof typeof networkList].name;

    setAccountInfo({
      balance,
      currency,
      accountName,
      networkName,
    });
    setOrigins({
      isOriginDeepLink,
      isOriginWalletConnect,
      isOriginMMSDKRemoteConn,
    });
  }, [accounts, identities, origin, selectedAddress, network]);

  const networkImage = useMemo(() => {
    const { chainId } = network;
    if (isMainnetByChainId(chainId)) return TEST_REMOTE_IMAGE_SOURCE;
    const networkImageName = getImage(chainId);
    if (networkImageName)
      return images[networkImageName as keyof typeof images];

    return null;
  }, [network]);

  const domainTitle = useMemo(() => {
    const { isOriginDeepLink, isOriginWalletConnect, isOriginMMSDKRemoteConn } =
      origins;
    let title = '';
    if (isOriginDeepLink) title = renderShortAddress(spenderAddress);
    else if (isOriginWalletConnect)
      title = getHost(origin.split(WALLET_CONNECT_ORIGIN)[1]);
    else if (isOriginMMSDKRemoteConn) {
      title = getHost(origin.split(MM_SDK_REMOTE_ORIGIN)[1]);
    } else title = getHost(currentEnsName || url || origin);

    return title;
  }, [currentEnsName, origin, origins, spenderAddress, url]);

  const favIconUrl = useMemo(() => {
    const { isOriginWalletConnect, isOriginMMSDKRemoteConn } = origins;
    let newUrl = url;
    if (isOriginWalletConnect) {
      newUrl = origin.split(WALLET_CONNECT_ORIGIN)[1];
    } else if (isOriginMMSDKRemoteConn) {
      newUrl = origin.split(MM_SDK_REMOTE_ORIGIN)[1];
    }
    return FAV_ICON_URL(getHost(newUrl));
  }, [origin, origins, url]);

  return (
    <View style={styles.transactionHeader}>
      <TagUrl
        imageSource={{ uri: favIconUrl }}
        label={domainTitle}
        style={styles.tagUrl}
      />
      <AccountBalance
        accountAddress={selectedAddress}
        accountNativeCurrency={accountInfo.currency}
        accountBalance={accountInfo.balance}
        accountName={accountInfo.accountName}
        accountBalanceLabel={strings('transaction.balance')}
        accountNetwork={network.nickname || accountInfo.networkName}
        badgeProps={{
          variant: BadgeVariants.Network,
          name: accountInfo.networkName,
          imageSource: networkImage,
        }}
      />
    </View>
  );
};

export default ApproveTransactionHeader;
