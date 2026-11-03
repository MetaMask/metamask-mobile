import React, { useCallback, useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { selectSessionProfileId } from '../../../../selectors/identity';
import { useTaxDocumentation } from '../hooks/useTaxDocumentation';
import {
  clearTaxFormSession,
  readTaxFormSession,
  type TaxFormSession,
} from '../utils/taxDocumentation';
import { REWARDS_TAX_FORM_VIEW_TEST_IDS } from './RewardsTaxFormView.testIds';

export interface RewardsTaxFormViewParams {
  url: string;
  profileId: string;
}

/** One extra mint after the Continue mint. A second expiry closes the form. */
const MAX_TOKEN_REMINTS = 1;

interface TaxFormPageMessage {
  type?: unknown;
}

function parseTaxFormMessage(data: string): TaxFormPageMessage | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed as TaxFormPageMessage;
  } catch {
    return null;
  }
}

function tokenMessage(session: TaxFormSession): string {
  return JSON.stringify({
    type: 'tax-form:token',
    token: session.token,
    expiresAt: session.expiresAt,
  });
}

function allowsNavigation(requestUrl: string, origin: string): boolean {
  if (requestUrl === 'about:blank') {
    return true;
  }
  try {
    return new URL(requestUrl).origin === origin;
  } catch {
    return false;
  }
}

const RewardsTaxFormView: React.FC = () => {
  const route = useRoute();
  const { url, profileId: paramProfileId } =
    route.params as RewardsTaxFormViewParams;
  const sessionProfileId = useSelector(selectSessionProfileId) ?? '';
  const profileId = paramProfileId || sessionProfileId;
  const {
    replaceExpiredToken,
    rerouteFromForm,
    openPendingReview,
    closeFormWithError,
  } = useTaxDocumentation(profileId);
  const webViewRef = useRef<WebView>(null);
  const sessionRef = useRef<TaxFormSession | null>(readTaxFormSession());
  const remintsRef = useRef(0);
  const origin = new URL(url).origin;

  useEffect(
    () => () => {
      clearTaxFormSession();
    },
    [],
  );

  const postToken = useCallback(() => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }
    webViewRef.current?.postMessage(tokenMessage(session));
  }, []);

  const handleClose = useCallback(() => {
    void rerouteFromForm();
  }, [rerouteFromForm]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseTaxFormMessage(event.nativeEvent.data);
      if (!message || typeof message.type !== 'string') {
        return;
      }
      if (message.type === 'tax-form:ready') {
        postToken();
        return;
      }
      if (message.type === 'tax-form:success') {
        openPendingReview();
        return;
      }
      if (message.type === 'tax-form:token-expired') {
        if (remintsRef.current >= MAX_TOKEN_REMINTS) {
          closeFormWithError();
          return;
        }
        remintsRef.current += 1;
        void replaceExpiredToken().then((minted) => {
          if (!minted) {
            return;
          }
          sessionRef.current = {
            token: minted.token,
            expiresAt: minted.expires_at,
          };
          postToken();
        });
        return;
      }
      if (message.type === 'tax-form:tin-mismatch') {
        void rerouteFromForm();
        return;
      }
      if (
        message.type === 'tax-form:error' ||
        message.type === 'tax-form:submit_failed'
      ) {
        return;
      }
    },
    [
      closeFormWithError,
      openPendingReview,
      postToken,
      replaceExpiredToken,
      rerouteFromForm,
    ],
  );

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={REWARDS_TAX_FORM_VIEW_TEST_IDS.CONTAINER}
    >
      <Box twClassName="items-end px-4 pt-4">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          iconProps={{ color: IconColor.IconAlternative, size: IconSize.Md }}
          onPress={handleClose}
          accessibilityLabel="Close"
          testID={REWARDS_TAX_FORM_VIEW_TEST_IDS.CLOSE}
        />
      </Box>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        originWhitelist={[origin]}
        onShouldStartLoadWithRequest={(request) =>
          allowsNavigation(request.url, origin)
        }
        onMessage={handleMessage}
        incognito
        cacheEnabled={false}
        testID={REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW}
      />
    </Box>
  );
};

export default RewardsTaxFormView;
