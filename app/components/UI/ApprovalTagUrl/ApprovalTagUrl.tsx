import { toChecksumAddress } from 'ethereumjs-util';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../locales/i18n';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import { useStyles } from '../../../component-library/hooks';
import AppConstants from '../../../core/AppConstants';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { getHost, prefixUrlWithProtocol } from '../../../util/browser';
import useFavicon from '../../hooks/useFavicon/useFavicon';
import stylesheet from './ApprovalTagUrl.styles';
import { INTERNAL_ORIGINS } from '../../../constants/transaction';

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

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(from);

  useEffect(() => {
    const isOriginDeepLinkVal =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;

    setIsOriginDeepLink(isOriginDeepLinkVal);
  }, [accountsByChainId, internalAccounts, activeAddress, origin]);

  const domainTitle = useMemo(() => {
    let title = '';

    if (currentEnsName) {
      title = prefixUrlWithProtocol(currentEnsName);
    } else if (origin && isOriginDeepLink) {
      title = prefixUrlWithProtocol(origin);
    } else if (url) {
      title = prefixUrlWithProtocol(getHost(url));
    } else if (origin) {
      title = prefixUrlWithProtocol(getHost(origin)); 
    } else {
      title = '';
    }

    return title;
  }, [currentEnsName, origin, url, isOriginDeepLink]);

  const faviconSource = useFavicon(origin as string) as
    | { uri: string }
    | undefined;

  const imageSource = faviconSource?.uri
    ? faviconSource
    : sdkDappMetadata?.icon
    ? { uri: sdkDappMetadata.icon }
    : {
        uri: '',
      };

  const showOrigin = origin && !isOriginDeepLink && !INTERNAL_ORIGINS.includes(origin);

  if (showOrigin) {
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
