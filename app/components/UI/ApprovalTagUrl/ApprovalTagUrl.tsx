import { toChecksumAddress } from 'ethereumjs-util';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../locales/i18n';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import AppConstants from '../../../core/AppConstants';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import useFavicon from '../../hooks/useFavicon/useFavicon';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { useStyles } from '../../../component-library/hooks';
import stylesheet from './ApprovalTagUrl.styles';

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;
export const APPROVAL_TAG_URL_ORIGIN_PILL = 'APPROVAL_TAG_URL_ORIGIN_PILL';

interface ApprovalTagUrlProps {
  currentEnsName?: string;
  from: string;
  origin?: string;
  sdkDappMetadata?: {
    url: string;
    icon: string;
  };
  url: string;
}

const ApprovalTagUrl = ({
  from,
  origin,
  url,
  sdkDappMetadata,
  currentEnsName,
}: ApprovalTagUrlProps) => {
  const { styles } = useStyles(stylesheet, {});
  const [isOriginDeepLink, setIsOriginDeepLink] = useState(false);
  const [isOriginWalletConnect, setIsOriginWalletConnect] = useState(false);
  const [isOriginMMSDKRemoteConn, setIsOriginMMSDKRemoteConn] = useState(false);

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(from);

  useEffect(() => {
    const isOriginDeepLinkVal =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;

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
  }, [accountsByChainId, internalAccounts, activeAddress, origin]);

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
    } else if (url || currentEnsName) {
      title = prefixUrlWithProtocol(currentEnsName || url || '');
    } else {
      title = '';
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

  const imageSource = faviconSource?.uri
    ? faviconSource
    : sdkDappMetadata?.icon
    ? { uri: sdkDappMetadata.icon }
    : {
        uri: '',
      };

  if (origin && !isOriginDeepLink) {
    return (
      <TagUrl
        testID={APPROVAL_TAG_URL_ORIGIN_PILL}
        imageSource={imageSource}
        label={domainTitle || sdkDappMetadata?.url || strings('sdk.unknown')}
        style={styles.tagUrl}
      />
    );
  }
  return null;
};

export default ApprovalTagUrl;
