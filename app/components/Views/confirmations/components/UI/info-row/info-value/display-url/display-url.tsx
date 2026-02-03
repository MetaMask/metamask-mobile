import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../../component-library/hooks';
import AppConstants from '../../../../../../../../core/AppConstants';
import { useOriginTrustSignals } from '../../../../../hooks/useOriginTrustSignals';
import { TrustSignalDisplayState } from '../../../../../types/trustSignals';
import styleSheet from './display-url.styles';

interface DisplayURLProps {
  url: string;
  /**
   * The request source (e.g., 'In-App-Browser', 'WalletConnect').
   * Used to determine if the origin is verifiable for showing Verified badge.
   * When undefined, Verified badge will not be shown (conservative approach).
   */
  requestSource?: string;
}

function extractHostname(url: string) {
  // eslint-disable-next-line no-useless-escape
  const match = url.match(/^(?:https?:\/\/)?([^\/:]+)/);
  return match ? match[1] : null;
}

/**
 * Check if the origin is verifiable (not spoofable).
 *
 * Only in-app browser origins are verifiable. WalletConnect and SDK connections
 * allow the dApp to self-report their origin, which can be spoofed.
 *
 * @param requestSource - The request source from pageMeta.analytics.request_source
 * @returns true if the origin can be trusted, false otherwise
 */
function isOriginVerifiable(requestSource: string | undefined): boolean {
  return requestSource === AppConstants.REQUEST_SOURCES.IN_APP_BROWSER;
}

const DisplayURL = ({ url, requestSource }: DisplayURLProps) => {
  const [isHTTP, setIsHTTP] = useState(false);
  const { state: trustSignalState } = useOriginTrustSignals(url);

  useEffect(() => {
    let urlObject;
    try {
      urlObject = new URL(url);
    } catch (e) {
      console.error(e as Error, `DisplayURL: new URL(url) cannot parse ${url}`);
    }
    setIsHTTP(urlObject?.protocol === 'http:');
  }, [url]);

  const hostName = extractHostname(url);

  const { styles } = useStyles(styleSheet, {});

  /**
   * Render the appropriate icon based on trust signal state.
   * Priority order (matching extension):
   * 1. Malicious (always shown - even for spoofed origins, we warn about claimed malicious domains)
   * 2. HTTP Warning (shown for http:// URLs)
   * 3. Warning (always shown - same rationale as Malicious)
   * 4. Verified (ONLY shown for verifiable origins - in-app browser)
   * 5. No icon (Unknown state)
   */
  const renderIcon = () => {
    // Priority 1: Malicious
    if (trustSignalState === TrustSignalDisplayState.Malicious) {
      return (
        <Icon
          color={IconColor.Error}
          size={IconSize.Sm}
          name={IconName.Danger}
          style={styles.trustSignalIcon}
          testID="trust-signal-icon-malicious"
        />
      );
    }

    // Priority 2: HTTP Warning
    if (isHTTP) {
      return (
        <View style={styles.warningContainer}>
          <Icon
            color={IconColor.Warning}
            size={IconSize.Md}
            name={IconName.Danger}
          />
          <Text style={styles.warningText}>HTTP</Text>
        </View>
      );
    }

    // Priority 3: Warning
    if (trustSignalState === TrustSignalDisplayState.Warning) {
      return (
        <Icon
          color={IconColor.Warning}
          size={IconSize.Sm}
          name={IconName.Warning}
          style={styles.trustSignalIcon}
          testID="trust-signal-icon-warning"
        />
      );
    }

    // Priority 4: Verified (only for verifiable origins)
    // For spoofable origins (WalletConnect, SDK), we don't show Verified
    // because an attacker could claim to be a verified domain
    if (trustSignalState === TrustSignalDisplayState.Verified) {
      if (isOriginVerifiable(requestSource)) {
        return (
          <Icon
            color={IconColor.Info}
            size={IconSize.Sm}
            name={IconName.VerifiedFilled}
            style={styles.trustSignalIcon}
            testID="trust-signal-icon-verified"
          />
        );
      }
      // Don't show Verified for spoofable origins - fall through to no icon
    }

    // Priority 5: No icon (Unknown state or Verified with spoofable origin)
    return null;
  };

  return (
    <View style={styles.container}>
      {renderIcon()}
      <Text style={styles.value}>{hostName}</Text>
    </View>
  );
};

export default DisplayURL;
