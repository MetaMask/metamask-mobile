import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { getHost } from '../../../util/browser';
import { useSelector } from 'react-redux';
import networkList from '../../../util/networks';

import { renderShortAddress, renderAccountName } from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';
import { renderFromWei, hexToBN } from '../../../util/number';
import { getTicker } from '../../../util/transactions';
import { TEST_REMOTE_IMAGE_SOURCE } from '../../../component-library/components-temp/Accounts/AccountBalance/AccountBalance.constants';
import Avatar, {
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import Text from '../../../component-library/components/Texts/Text';
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

  const ticker = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.provider.ticker,
  );

  const networkType = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.provider.type,
  );

  const nickname = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.provider.nickname,
  );

  useEffect(() => {
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

    const networkName = networkList[networkType].name;

    setAccountInfo({ balance, currency, accountName, networkName });
    setOrigins({
      isOriginDeepLink,
      isOriginWalletConnect,
      isOriginMMSDKRemoteConn,
    });
  }, [accounts, identities, origin, selectedAddress, ticker, networkType]);

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

    title =
      title.length > MAX_DOMAIN_TITLE_LENGTH
        ? `${title.substring(0, MAX_DOMAIN_TITLE_LENGTH - 3)}...`
        : title;

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

  const renderTitle = () => (
    <View style={styles.domainUrlContainer}>
      <View style={styles.iconContainer}>
        <Avatar
          imageSource={{ uri: favIconUrl }}
          variant={AvatarVariants.Favicon}
        />
      </View>
      <Text style={styles.domainUrl}>{domainTitle}</Text>
    </View>
  );

  return (
    <View style={styles.transactionHeader}>
      {renderTitle()}

      <AccountBalance
        accountAddress={selectedAddress}
        accountNativeCurrency={accountInfo.currency}
        accountBalance={accountInfo.balance}
        accountName={accountInfo.accountName}
        accountBalanceLabel={strings('transaction.balance')}
        accountNetwork={nickname || accountInfo.networkName}
        badgeProps={{
          variant: BadgeVariants.Network,
          name: accountInfo.networkName,
          imageSource: TEST_REMOTE_IMAGE_SOURCE,
        }}
      />
    </View>
  );
};

export default ApproveTransactionHeader;
