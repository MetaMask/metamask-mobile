import { toChecksumAddress } from 'ethereumjs-util';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import AppConstants from '../../../../../core/AppConstants';
import { strings } from '../../../../../../locales/i18n';
import AccountBalance from '../../../../../component-library/components-temp/Accounts/AccountBalance';
import { BadgeVariant } from '../../../../../component-library/components/Badges/Badge';
import TagUrl from '../../../../../component-library/components/Tags/TagUrl';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../../../selectors/networkInfos';
import { selectIdentities } from '../../../../../selectors/preferencesController';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import {
  getLabelTextByAddress,
  renderAccountName,
} from '../../../../../util/address';
import { getUrlObj, prefixUrlWithProtocol } from '../../../../../util/browser';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import useAddressBalance from '../../../../hooks/useAddressBalance/useAddressBalance';
import useFavicon from '../../../../hooks/useFavicon/useFavicon';
import {
  APPROVE_TRANSACTION_ORIGIN_PILL,
  ORIGIN_DEEPLINK,
  ORIGIN_QR_CODE,
} from './ApproveTransactionHeader.constants';
import stylesheet from './ApproveTransactionHeader.styles';
import { ApproveTransactionHeaderI } from './ApproveTransactionHeader.types';

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

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const identities = useSelector(selectIdentities);
  const activeAddress = toChecksumAddress(from);

  const networkName = useSelector(selectNetworkName);

  const useBlockieIcon = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.settings.useBlockieIcon,
  );

  useEffect(() => {
    const accountNameVal = activeAddress
      ? renderAccountName(activeAddress, identities)
      : '';

    const isOriginDeepLinkVal =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;

    setAccountName(accountNameVal);
    setIsOriginDeepLink(isOriginDeepLinkVal);

    if (!origin) {
      setIsOriginWalletConnect(false);
      setIsOriginMMSDKRemoteConn(false);

      return;
    }

    setIsOriginWalletConnect(origin.startsWith(WALLET_CONNECT_ORIGIN));
    setIsOriginMMSDKRemoteConn(
      origin.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN),
    );
  }, [accountsByChainId, identities, activeAddress, origin]);

  const networkImage = useSelector(selectNetworkImageSource);

  const domainTitle = useMemo(() => {
    let title = '';
    if (isOriginWalletConnect) {
      title = getUrlObj(
        (origin as string).split(WALLET_CONNECT_ORIGIN)[1],
      ).origin;
    } else if (isOriginMMSDKRemoteConn) {
      title = getUrlObj(
        (origin as string).split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1],
      ).origin;
    } else {
      title = prefixUrlWithProtocol(currentEnsName || origin || url);
    }

    return title;
  }, [
    currentEnsName,
    origin,
    isOriginWalletConnect,
    isOriginMMSDKRemoteConn,
    url,
  ]);

  const faviconUpdatedOrigin = useMemo(() => {
    let newOrigin = origin as string;
    if (isOriginWalletConnect) {
      newOrigin = newOrigin.split(WALLET_CONNECT_ORIGIN)[1];
    } else if (isOriginMMSDKRemoteConn) {
      newOrigin = newOrigin.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1];
    }
    return newOrigin;
  }, [origin, isOriginWalletConnect, isOriginMMSDKRemoteConn]);

  const faviconSource = useFavicon(faviconUpdatedOrigin);

  const accountTypeLabel = getLabelTextByAddress(activeAddress);

  return (
    <View style={styles.transactionHeader}>
      {origin && !isOriginDeepLink ? (
        <TagUrl
          testID={APPROVE_TRANSACTION_ORIGIN_PILL}
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
