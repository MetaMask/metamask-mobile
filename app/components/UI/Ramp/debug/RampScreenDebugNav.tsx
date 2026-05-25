import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import useRampsController from '../hooks/useRampsController';
import {
  DEBUG_HEADLESS_ASSET_ID,
  registerDebugHeadlessSession,
} from './createDebugHeadlessSession';
import {
  DEBUG_US_REGION_CA,
  DEBUG_US_REGION_COUNTRY,
  ensureDebugUserRegion,
} from './debugUserRegion';
import { isRampScreenDebugNavEnabled } from './rampScreenDebugEnabled';

const DEBUG_ORDER_ID = 'debug-order-preview';

/** Minimal quote stub for screens that require `TransakBuyQuote` in route params. */
const DEBUG_QUOTE = { id: 'debug-quote-id' } as TransakBuyQuote;

const DEBUG_PLACEHOLDER_URL = 'https://example.com';

type RampDebugRoute = {
  label: string;
  route?: string;
  modalScreen?: string;
  params?: Record<string, unknown>;
  hint?: string;
  onPress?: () => void;
  regionBeforeNavigate?: string;
};

const RAMP_DEBUG_ROUTES: RampDebugRoute[] = [
  {
    label: 'BuildQuote',
    route: Routes.RAMP.AMOUNT_INPUT,
    params: { amount: 100 },
  },
  {
    label: 'Enter email',
    route: Routes.RAMP.ENTER_EMAIL,
    params: { amount: '100', currency: 'USD' },
  },
  {
    label: 'OTP code',
    route: Routes.RAMP.OTP_CODE,
    params: {
      email: 'debug@example.com',
      stateToken: 'debug-state-token',
      amount: '100',
      currency: 'USD',
    },
  },
  {
    label: 'Verify identity',
    route: Routes.RAMP.VERIFY_IDENTITY,
    params: { amount: '100', currency: 'USD' },
  },
  {
    label: 'Basic info',
    route: Routes.RAMP.BASIC_INFO,
    params: { quote: DEBUG_QUOTE },
    hint: 'sets US-CA',
    regionBeforeNavigate: DEBUG_US_REGION_CA,
  },
  {
    label: 'Enter address',
    route: Routes.RAMP.ENTER_ADDRESS,
    params: { quote: DEBUG_QUOTE },
    hint: 'sets US-CA',
    regionBeforeNavigate: DEBUG_US_REGION_CA,
  },
  {
    label: 'KYC processing',
    route: Routes.RAMP.KYC_PROCESSING,
  },
  {
    label: 'Additional verification',
    route: Routes.RAMP.ADDITIONAL_VERIFICATION,
    params: {
      quote: DEBUG_QUOTE,
      kycUrl: DEBUG_PLACEHOLDER_URL,
      workFlowRunId: 'debug-workflow-run',
      amount: 100,
    },
  },
  {
    label: 'KYC webview',
    route: Routes.RAMP.KYC_WEBVIEW,
    params: {
      url: DEBUG_PLACEHOLDER_URL,
      providerName: 'Transak',
      workFlowRunId: 'debug-workflow-run',
      quote: DEBUG_QUOTE,
      amount: 100,
    },
  },
  {
    label: 'Bank details',
    route: Routes.RAMP.BANK_DETAILS,
    params: { orderId: 'debug-order-id', shouldUpdate: false },
    hint: 'needs real orderId',
  },
  {
    label: 'Order · pending',
    route: Routes.RAMP.ORDER_PROCESSING,
    params: {
      orderId: DEBUG_ORDER_ID,
      debugPreviewState: FIAT_ORDER_STATES.PENDING,
    },
    hint: 'fake order',
  },
  {
    label: 'Order · completed',
    route: Routes.RAMP.ORDER_PROCESSING,
    params: {
      orderId: DEBUG_ORDER_ID,
      debugPreviewState: FIAT_ORDER_STATES.COMPLETED,
    },
    hint: 'fake order',
  },
  {
    label: 'Order · failed',
    route: Routes.RAMP.ORDER_PROCESSING,
    params: {
      orderId: DEBUG_ORDER_ID,
      debugPreviewState: FIAT_ORDER_STATES.FAILED,
    },
    hint: 'fake order',
  },
  {
    label: 'Order · cancelled',
    route: Routes.RAMP.ORDER_PROCESSING,
    params: {
      orderId: DEBUG_ORDER_ID,
      debugPreviewState: FIAT_ORDER_STATES.CANCELLED,
    },
    hint: 'fake order',
  },
  {
    label: 'Checkout',
    route: Routes.RAMP.CHECKOUT,
    params: {
      url: DEBUG_PLACEHOLDER_URL,
      providerName: 'Debug',
      providerCode: 'transak',
      orderId: 'debug-order-id',
    },
  },
  {
    label: 'Order details',
    route: Routes.RAMP.RAMPS_ORDER_DETAILS,
    params: { orderId: 'debug-order-id', showCloseButton: true },
    hint: 'needs real orderId',
  },
  {
    label: 'Modal · Unsupported state',
    modalScreen: Routes.RAMP.MODALS.UNSUPPORTED_STATE,
    params: {
      stateCode: 'NY',
      stateName: 'New York',
      onStateSelect: () => undefined,
    },
    hint: 'BottomSheet',
  },
  {
    label: 'Modal · State selector',
    modalScreen: Routes.RAMP.MODALS.STATE_SELECTOR,
    params: {
      selectedState: 'CA',
      onStateSelect: () => undefined,
    },
  },
  {
    label: 'Modal · Unsupported token',
    modalScreen: Routes.RAMP.MODALS.UNSUPPORTED_TOKEN,
  },
  {
    label: 'Modal · Error details',
    modalScreen: Routes.RAMP.MODALS.ERROR_DETAILS,
    params: {
      errorMessage: 'Debug error preview',
      providerName: 'Transak',
    },
  },
  {
    label: 'Modal · Processing info',
    modalScreen: Routes.RAMP.MODALS.PROCESSING_INFO,
    params: { providerName: 'Transak' },
  },
  {
    label: 'Modal · SSN info',
    modalScreen: Routes.RAMP.MODALS.SSN_INFO,
  },
];

/**
 * Dev-only shortcut panel to jump to Ramp stack screens from TokenSelection.
 */
export function RampScreenDebugNav(): React.ReactElement | null {
  const navigation = useNavigation();
  const tw = useTailwind();
  const [expanded, setExpanded] = useState(true);
  const {
    setSelectedToken,
    setSelectedProvider,
    setSelectedPaymentMethod,
    setUserRegion,
    userRegion,
    providers,
    paymentMethods,
  } = useRampsController();

  const routes = useMemo((): RampDebugRoute[] => {
    const seedControllerForHeadless = () => {
      setSelectedToken(DEBUG_HEADLESS_ASSET_ID);
      setSelectedProvider(
        providers?.find((provider) => provider.id === 'transak') ?? null,
      );
      setSelectedPaymentMethod(
        paymentMethods?.find(
          (method) => method.id === '/payments/debit-credit-card',
        ) ?? null,
      );
    };

    const setRegion = (regionCode: string) => {
      void ensureDebugUserRegion(setUserRegion, regionCode);
    };

    const activeCountry = userRegion?.country?.name ?? 'not set';

    return [
      ...RAMP_DEBUG_ROUTES,
      {
        label: 'Region → US-CA',
        hint:
          userRegion?.regionCode === DEBUG_US_REGION_CA
            ? `active · ${activeCountry}`
            : `now: ${activeCountry}`,
        onPress: () => setRegion(DEBUG_US_REGION_CA),
      },
      {
        label: 'Region → US',
        hint:
          userRegion?.regionCode === DEBUG_US_REGION_COUNTRY
            ? `active · ${activeCountry}`
            : `now: ${activeCountry}`,
        onPress: () => setRegion(DEBUG_US_REGION_COUNTRY),
      },
      {
        label: 'Headless (flow)',
        hint: 'fake session → next screen',
        onPress: () => {
          const sessionId = registerDebugHeadlessSession();
          seedControllerForHeadless();
          navigation.navigate(Routes.RAMP.HEADLESS_HOST, {
            headlessSessionId: sessionId,
          });
        },
      },
      {
        label: 'Headless (panel)',
        hint: 'host status UI only',
        onPress: () => {
          const sessionId = registerDebugHeadlessSession();
          navigation.navigate(Routes.RAMP.HEADLESS_HOST, {
            headlessSessionId: sessionId,
            debugPreviewUi: true,
          });
        },
      },
    ];
  }, [
    navigation,
    paymentMethods,
    providers,
    setSelectedPaymentMethod,
    setSelectedProvider,
    setSelectedToken,
    setUserRegion,
    userRegion?.regionCode,
    userRegion?.country?.name,
  ]);

  const handleNavigate = useCallback(
    (item: RampDebugRoute) => {
      const navigateToRoute = () => {
        if (item.modalScreen) {
          navigation.navigate(Routes.RAMP.MODALS.ID as never, {
            screen: item.modalScreen,
            params: item.params,
          } as never);
          return;
        }
        if (item.route) {
          navigation.navigate(
            item.route as never,
            (item.params ?? undefined) as never,
          );
        }
      };

      if (item.onPress) {
        item.onPress();
        return;
      }

      if (item.regionBeforeNavigate) {
        void ensureDebugUserRegion(
          setUserRegion,
          item.regionBeforeNavigate,
        ).then(navigateToRoute);
        return;
      }

      navigateToRoute();
    },
    [navigation, setUserRegion],
  );

  if (!isRampScreenDebugNavEnabled()) {
    return null;
  }

  return (
    <Box
      twClassName="border-t border-muted bg-muted mx-0 mt-2"
      testID="ramp-screen-debug-nav"
    >
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={tw.style('px-4 py-3')}
      >
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
          {expanded ? '▼' : '▶'} Ramp screen debug ({routes.length})
        </Text>
      </Pressable>
      {expanded ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-3 pb-4 gap-2 flex-row')}
          keyboardShouldPersistTaps="handled"
        >
          {routes.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => handleNavigate(item)}
              style={tw.style(
                'rounded-lg bg-default border border-muted px-3 py-2 min-w-[120px]',
              )}
            >
              <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
                {item.label}
              </Text>
              {item.hint ? (
                <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
                  {item.hint}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </Box>
  );
}

export default RampScreenDebugNav;
