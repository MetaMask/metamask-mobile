import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { strings } from '../../../../../../locales/i18n';
import {
  getHardwareTier,
  type HardwareTier,
} from '../../../../../util/deviceCapability';
import {
  useNetworkTier,
  type NetworkTier,
} from '../../../../../hooks/useNetworkTier';
import Engine from '../../../../../core/Engine';
import type { CardRootParamList } from '../../types/navigation';
import { CardType } from '../../types';
import { CARD_DETAILS_CSS } from '../../hooks/useCardDetailsToken';
import { CardScreenshotDeterrent } from '../../components/CardScreenshotDeterrent';
import { CardViewCardDetailsSelectors } from './CardViewCardDetails.testIds';

const CARD_DETAILS_SUCCESS = 'card:details:success';
const CARD_DETAILS_FAILED = 'card:details:failed';

type CardDetailsPageEvent =
  | typeof CARD_DETAILS_SUCCESS
  | typeof CARD_DETAILS_FAILED;

type Phase = 'page' | 'error' | 'loading';

type CardViewCardDetailsRoute = RouteProp<
  CardRootParamList,
  'CardViewCardDetails'
>;

function readOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
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

function readCardDetailsEvent(data: string): CardDetailsPageEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null || !('event' in parsed)) {
      return null;
    }
    const event = (parsed as { event: unknown }).event;
    if (event === CARD_DETAILS_SUCCESS || event === CARD_DETAILS_FAILED) {
      return event;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Every hardware tier shows the hosted page. Offline skips another token
 * request. A null network tier is unknown, not offline.
 */
function hostedCardDetailsPageAllowed(
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean {
  const hardwareAllowsPage =
    hardwareTier === 'LOW' ||
    hardwareTier === 'MID' ||
    hardwareTier === 'HIGH' ||
    hardwareTier === null;
  return networkTier !== 'NONE' && hardwareAllowsPage;
}

const CardViewCardDetails = () => {
  const navigation = useNavigation();
  const route = useRoute<CardViewCardDetailsRoute>();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const retryingRef = useRef(false);
  const [pageUrl, setPageUrl] = useState(route.params?.hostedPageUrl ?? '');
  const [pageGeneration, setPageGeneration] = useState(0);
  const [phase, setPhase] = useState<Phase>('page');

  const origin = readOrigin(pageUrl);
  const showPage =
    phase === 'page' &&
    hostedCardDetailsPageAllowed(hardwareTier, networkTier) &&
    origin !== null;

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_home.view_card_details_error') },
      ],
      hasNoTimeout: false,
      iconName: ToastIconName.Warning,
    });
  }, [toastRef]);

  const fail = useCallback(() => {
    if (retryingRef.current) {
      return;
    }
    setPhase('error');
    showErrorToast();
  }, [showErrorToast]);

  const retry = useCallback(async () => {
    if (retryingRef.current) {
      return;
    }
    if (!hostedCardDetailsPageAllowed(hardwareTier, networkTier)) {
      setPhase('error');
      showErrorToast();
      return;
    }
    retryingRef.current = true;
    setPhase('loading');
    try {
      const view = await Engine.context.CardController.getCardDetailsView({
        customCss: CARD_DETAILS_CSS[CardType.VIRTUAL],
      });
      if (!view.hostedPageUrl) {
        setPhase('error');
        showErrorToast();
        return;
      }
      setPageUrl(view.hostedPageUrl);
      setPageGeneration((generation) => generation + 1);
      setPhase('page');
    } catch {
      setPhase('error');
      showErrorToast();
    } finally {
      retryingRef.current = false;
    }
  }, [hardwareTier, networkTier, showErrorToast]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const cardEvent = readCardDetailsEvent(event.nativeEvent.data);
      if (cardEvent === CARD_DETAILS_FAILED) {
        fail();
      }
    },
    [fail],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['top', 'bottom']}
    >
      <Box twClassName="flex-row justify-end px-4 py-2">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          iconProps={{
            color: IconColor.IconDefault,
            size: IconSize.Md,
          }}
          onPress={handleClose}
          accessibilityLabel={strings('navigation.close')}
          testID={CardViewCardDetailsSelectors.CLOSE_BUTTON}
        />
      </Box>
      {phase === 'loading' ? (
        <Box
          twClassName="flex-1 items-center justify-center"
          testID={CardViewCardDetailsSelectors.LOADING}
        >
          <Spinner spinnerIconProps={{ size: IconSize.Xl }} />
        </Box>
      ) : showPage && origin ? (
        <Box twClassName="flex-1">
          <WebView
            key={pageGeneration}
            source={{ uri: pageUrl }}
            style={tw.style('flex-1')}
            originWhitelist={[origin]}
            onShouldStartLoadWithRequest={(request) =>
              allowsNavigation(request.url, origin)
            }
            onMessage={handleMessage}
            onError={fail}
            onHttpError={fail}
            onContentProcessDidTerminate={() => {
              retry().catch(() => undefined);
            }}
            incognito
            cacheEnabled={false}
            pullToRefreshEnabled={false}
            sharedCookiesEnabled={false}
            setSupportMultipleWindows={false}
            testID={CardViewCardDetailsSelectors.WEBVIEW}
          />
        </Box>
      ) : (
        <Box
          twClassName="flex-1 items-center justify-center px-6 gap-4"
          testID={CardViewCardDetailsSelectors.ERROR}
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('card.card_home.view_card_details_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => {
              retry().catch(() => undefined);
            }}
            testID={CardViewCardDetailsSelectors.RETRY_BUTTON}
          >
            {strings('card.card_home.try_again')}
          </Button>
        </Box>
      )}
      <CardScreenshotDeterrent enabled={showPage} />
    </SafeAreaView>
  );
};

export default CardViewCardDetails;
