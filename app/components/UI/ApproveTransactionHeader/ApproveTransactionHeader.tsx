import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { getHost, getUrlObj } from '../../../util/browser';
import { useSelector } from 'react-redux';
import {
  getNetworkNameFromProvider,
  getNetworkImageSource,
} from '../../../util/networks';

import { renderShortAddress, renderAccountName } from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { renderFromWei, hexToBN } from '../../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import { getTicker } from '../../../util/transactions';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';
import TagUrl from '../../../component-library/components/Tags/TagUrl';

import { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import stylesheet from './ApproveTransactionHeader.styles';
import {
  FAV_ICON_URL,
  ORIGIN_DEEPLINK,
  ORIGIN_QR_CODE,
} from './ApproveTransactionHeader.constants';
import { ApproveTransactionHeaderI } from './ApproveTransactionHeader.types';
import { selectProviderConfig } from '../../../selectors/networkController';
import AppConstants from '../../../../app/core/AppConstants';

const ApproveTransactionHeader = ({
  from,
  origin,
  url,
  currentEnsName,
}: ApproveTransactionHeaderI) => {
  const [accountBalance, setAccountBalance] = useState(0);
  const [accountCurrency, setAccountCurrency] = useState('');
  const [accountName, setAccountName] = useState('');

  const [isOriginDeepLink, setIsOriginDeepLink] = useState(false);
  const [isOriginWalletConnect, setIsOriginWalletConnect] = useState(false);
  const [isOriginMMSDKRemoteConn, setIsOriginMMSDKRemoteConn] = useState(false);

  const { styles } = useStyles(stylesheet, {});

  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const network = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.providerConfig,
  );

  const activeAddress = toChecksumAddress(from);

  const networkProvider = useSelector(selectProviderConfig);
  const networkName = getNetworkNameFromProvider(networkProvider);

  const useBlockieIcon = useSelector(
    (state: any) => state.settings.useBlockieIcon,
  );

  useEffect(() => {
    const { ticker } = network;
    const weiBalance = activeAddress
      ? hexToBN(accounts[activeAddress].balance)
      : 0;

    const balance = Number(renderFromWei(weiBalance));
    const currency = getTicker(ticker);
    const accountNameVal = activeAddress
      ? renderAccountName(activeAddress, identities)
      : '';

    const isOriginDeepLinkVal =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;
    const isOriginWalletConnectVal = origin?.startsWith(WALLET_CONNECT_ORIGIN);

    const isOriginMMSDKRemoteConnVal = origin?.startsWith(
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
    );

    setAccountBalance(balance);
    setAccountCurrency(currency);
    setAccountName(accountNameVal);
    setIsOriginDeepLink(isOriginDeepLinkVal);
    setIsOriginWalletConnect(isOriginWalletConnectVal);
    setIsOriginMMSDKRemoteConn(isOriginMMSDKRemoteConnVal);
  }, [accounts, identities, activeAddress, network, origin]);

  const networkImage = getNetworkImageSource({
    networkType: networkProvider.type,
    chainId: networkProvider.chainId,
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
      title = getUrlObj(currentEnsName || url || origin).origin;
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

  const favIconUrl = useMemo(() => {
    let newUrl = url;
    if (isOriginWalletConnect) {
      newUrl = origin.split(WALLET_CONNECT_ORIGIN)[1];
    } else if (isOriginMMSDKRemoteConn) {
      newUrl = origin.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1];
    }
    return FAV_ICON_URL(getHost(newUrl));
  }, [origin, isOriginWalletConnect, isOriginMMSDKRemoteConn, url]);

  return (
    <View style={styles.transactionHeader}>
      {origin ? (
        <TagUrl
          imageSource={{ uri: favIconUrl }}
          label={domainTitle}
          style={styles.tagUrl}
        />
      ) : null}
      <AccountBalance
        accountAddress={activeAddress}
        accountNativeCurrency={accountCurrency}
        accountBalance={accountBalance}
        accountName={accountName}
        accountBalanceLabel={strings('transaction.balance')}
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
