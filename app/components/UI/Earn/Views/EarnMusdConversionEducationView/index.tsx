import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { Image, StyleSheet, useColorScheme } from 'react-native';
import { setMusdConversionEducationSeen } from '../../../../../actions/user';
import Logger from '../../../../../util/Logger';
import musdEducationBackgroundV2Dark from '../../../../../images/musd-conversion-education-screen-v2-dark-3x.png';
import musdEducationBackgroundV2Light from '../../../../../images/musd-conversion-education-screen-v2-light-3x.png';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
// component-library TagBase: DSRN Tag has no startAccessory + Rectangle shape support
import TagBase from '../../../../../component-library/base-components/TagBase';
import {
  TagShape,
  TagSeverity,
} from '../../../../../component-library/base-components/TagBase/TagBase.types';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
} from '../../constants/musd';
import { useMusdConversionFlowData } from '../../hooks/useMusdConversionFlowData';
import Routes from '../../../../../constants/navigation/Routes';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { RampIntent } from '../../../Ramp/types';
import { EARN_TEST_IDS } from '../../constants/testIds';
import { MusdNavigationTarget } from '../../types/musd.types';
import { toChecksumAddress } from '../../../../../util/address';
import { safeFormatChainIdToHex } from '../../../Card/util/safeFormatChainIdToHex';
import { MONEY_EVENTS_CONSTANTS } from '../../../Money/constants/moneyEvents';
import { selectMoneyHubEnabledFlag } from '../../../Money/selectors/featureFlags';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  heading: {
    fontFamily: 'MMPoly-Regular',
    fontSize: 40,
    lineHeight: 40,
    paddingVertical: 16,
    textAlign: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

interface EarnMusdConversionEducationViewRouteParams {
  /**
   * Indicates if this navigation originated from a deeplink
   * When true, the component determines routing based on user state
   */
  isDeeplink?: boolean;
  /**
   * The payment token to preselect in the confirmation screen
   * Optional - when not provided, determined based on network filter and token balance.
   * If specific network selected, will use the higher balance token for that network.
   * If "Popular networks" filter is active, will use the highest balance token across all networks.
   */
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
  /**
   * Pure-navigation exit target. When present, the primary button routes here and
   * skips conversion entirely. Use for entry points that only needed the education
   * screen as a gate (e.g., home -> Money Hub).
   */
  returnTo?: MusdNavigationTarget;
}

/**
 * Displays educational content before user's first mUSD conversion.
 * Once completed, marks the education as seen and proceeds to conversion flow.
 */
const EarnMusdConversionEducationView = () => {
  const dispatch = useDispatch();

  const isMoneyHubEnabled = useSelector(selectMoneyHubEnabledFlag);

  const { initiateCustomConversion } = useMusdConversion();
  const { goToBuy } = useRampNavigation();

  const { preferredPaymentToken, isDeeplink, returnTo } =
    useParams<EarnMusdConversionEducationViewRouteParams>();

  // Hooks for deeplink case (when no params provided)
  const {
    isGeoEligible,
    hasConvertibleTokens,
    getPaymentTokenForSelectedNetwork,
    getChainIdForBuyFlow,
    isMusdBuyable,
    conversionTokens,
  } = useMusdConversionFlowData();

  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();

  const colorScheme = useColorScheme();

  const { trackEvent, createEventBuilder } = useAnalytics();

  const backgroundImage = useMemo(
    () =>
      colorScheme === 'dark'
        ? musdEducationBackgroundV2Dark
        : musdEducationBackgroundV2Light,
    [colorScheme],
  );

  // Determine deeplink state when this is a deeplink navigation
  const deeplinkState = useMemo(() => {
    if (!isDeeplink) return null;
    if (!isGeoEligible) return { action: 'navigate_home' as const };

    // Try conversion flow if user has convertible tokens
    if (hasConvertibleTokens) {
      const fallbackToken = conversionTokens[0];
      const fallbackChainIdHex = fallbackToken?.chainId
        ? safeFormatChainIdToHex(fallbackToken.chainId)
        : null;
      const paymentToken =
        getPaymentTokenForSelectedNetwork() ??
        (fallbackToken?.address && fallbackChainIdHex?.startsWith('0x')
          ? {
              address: toChecksumAddress(fallbackToken.address) as Hex,
              chainId: fallbackChainIdHex as Hex,
            }
          : null);
      if (paymentToken) {
        return {
          action: 'convert' as const,
          paymentToken,
        };
      }
    }

    // Fallback to buy if available, otherwise go home
    if (isMusdBuyable) {
      return {
        action: 'buy' as const,
        chainId: getChainIdForBuyFlow(),
      };
    }

    // Fallback to the Money Hub if enabled.
    if (isMoneyHubEnabled) {
      return { action: 'navigate_money_hub' as const };
    }

    return { action: 'navigate_home' as const };
  }, [
    isDeeplink,
    isGeoEligible,
    hasConvertibleTokens,
    isMusdBuyable,
    isMoneyHubEnabled,
    conversionTokens,
    getPaymentTokenForSelectedNetwork,
    getChainIdForBuyFlow,
  ]);

  const primaryButtonText = useMemo(() => {
    if (deeplinkState?.action === 'navigate_home') {
      return strings('earn.musd_conversion.continue');
    }
    if (deeplinkState?.action === 'buy') {
      return strings('earn.musd_conversion.buy_musd');
    }
    return strings('earn.musd_conversion.education.primary_button');
  }, [deeplinkState]);

  const { BUTTON_TYPES, EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } =
    MUSD_EVENTS_CONSTANTS;
  const { EVENT_LOCATIONS: MONEY_EVENT_LOCATIONS } = MONEY_EVENTS_CONSTANTS;

  const submitScreenViewedEvent = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_DISPLAYED,
      )
        .addProperties({
          location: MUSD_EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
        })
        .build(),
    );
  }, [
    MUSD_EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
    createEventBuilder,
    trackEvent,
  ]);

  const hasSubmittedScreenViewedEventRef = useRef(false);

  useEffect(() => {
    if (hasSubmittedScreenViewedEventRef.current) {
      return;
    }
    hasSubmittedScreenViewedEventRef.current = true;
    submitScreenViewedEvent();
  }, [submitScreenViewedEvent]);

  const submitContinuePressedEvent = useCallback(() => {
    let redirectsTo = MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN;
    if (returnTo) {
      redirectsTo = MONEY_EVENT_LOCATIONS.MONEY_HUB;
    } else if (deeplinkState?.action === 'navigate_money_hub') {
      redirectsTo = MONEY_EVENT_LOCATIONS.MONEY_HUB;
    } else if (deeplinkState?.action === 'navigate_home') {
      redirectsTo = MUSD_EVENT_LOCATIONS.HOME_SCREEN;
    } else if (deeplinkState?.action === 'buy') {
      redirectsTo = MUSD_EVENT_LOCATIONS.BUY_SCREEN;
    }

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
      )
        .addProperties({
          location: MUSD_EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
          button_type: BUTTON_TYPES.PRIMARY,
          button_text: primaryButtonText,
          redirects_to: redirectsTo,
        })
        .build(),
    );
  }, [
    returnTo,
    MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
    MUSD_EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
    MUSD_EVENT_LOCATIONS.HOME_SCREEN,
    MUSD_EVENT_LOCATIONS.BUY_SCREEN,
    MONEY_EVENT_LOCATIONS.MONEY_HUB,
    deeplinkState?.action,
    trackEvent,
    createEventBuilder,
    BUTTON_TYPES.PRIMARY,
    primaryButtonText,
  ]);

  const submitGoBackPressedEvent = (redirectsTo?: string) => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
      )
        .addProperties({
          location: MUSD_EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
          button_type: BUTTON_TYPES.SECONDARY,
          button_text: strings(
            'earn.musd_conversion.education.secondary_button',
          ),
          ...(redirectsTo ? { redirects_to: redirectsTo } : {}),
        })
        .build(),
    );
  };

  const handleContinue = useCallback(async () => {
    try {
      submitContinuePressedEvent();
      // Mark education as seen so it won't show again
      dispatch(setMusdConversionEducationSeen(true));

      // Pop the education screen from the Earn stack before navigating to
      // returnTo, so the stale screen doesn't flash when the Earn stack is
      // re-entered later (e.g., for conversion confirmation).
      if (returnTo) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        navigation.navigate(returnTo.screen, returnTo.params);
        return;
      }

      // Handle deeplink case
      if (deeplinkState) {
        if (deeplinkState.action === 'navigate_home') {
          navigation.navigate(Routes.WALLET.HOME, {
            screen: Routes.WALLET.TAB_STACK_FLOW,
            params: {
              screen: Routes.WALLET_VIEW,
            },
          });
          return;
        }

        if (deeplinkState.action === 'buy') {
          const chainId =
            deeplinkState.chainId || MUSD_CONVERSION_DEFAULT_CHAIN_ID;
          const rampIntent: RampIntent = {
            assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId],
          };
          goToBuy(rampIntent);
          return;
        }

        if (deeplinkState.action === 'navigate_money_hub') {
          navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW);
          return;
        }

        if (deeplinkState.action === 'convert') {
          await initiateCustomConversion({
            preferredPaymentToken: deeplinkState.paymentToken,
            skipEducationCheck: true,
          });
          return;
        }
      }

      if (!isDeeplink && preferredPaymentToken) {
        await initiateCustomConversion({
          preferredPaymentToken,
          skipEducationCheck: true,
        });
        return;
      }

      Logger.error(
        new Error('Missing required parameters'),
        '[mUSD Conversion Education] Cannot proceed without preferredPaymentToken',
      );
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion Education] Failed to initiate conversion',
      );
    }
  }, [
    dispatch,
    initiateCustomConversion,
    preferredPaymentToken,
    submitContinuePressedEvent,
    deeplinkState,
    navigation,
    goToBuy,
    isDeeplink,
    returnTo,
  ]);

  const handleNotNow = () => {
    // Redirect to the Money Hub if enabled and geo-eligible.
    if (isDeeplink && isMoneyHubEnabled && isGeoEligible) {
      // Pop education screen from the navigation stack.
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      dispatch(setMusdConversionEducationSeen(true));
      submitGoBackPressedEvent(MONEY_EVENT_LOCATIONS.MONEY_HUB);
      navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW);
      return;
    }

    dispatch(setMusdConversionEducationSeen(true));
    submitGoBackPressedEvent();

    // Pop education screen from the navigation stack.
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    // Do not remove the top edge as this screen does not have a navbar set in the route options.
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
      testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.CONTAINER}
    >
      <Box twClassName="px-4 items-center">
        <Text style={styles.heading} numberOfLines={2} adjustsFontSizeToFit>
          {strings('earn.musd_conversion.education.heading', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-wrap gap-1 mt-4"
        >
          {[
            'earn.musd_conversion.education.checklist.dollar_backed',
            'earn.musd_conversion.education.checklist.no_lockups',
            'earn.musd_conversion.education.checklist.daily_bonus',
            'earn.musd_conversion.education.checklist.metamask_stablecoins',
            'earn.musd_conversion.education.checklist.no_metamask_fee',
          ].map((key) => (
            <TagBase
              key={key}
              shape={TagShape.Rectangle}
              severity={TagSeverity.Neutral}
              gap={4}
              startAccessory={
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Sm}
                  color={IconColor.SuccessDefault}
                />
              }
              textProps={{
                variant: ComponentTextVariant.BodySMMedium,
                numberOfLines: 1,
              }}
            >
              {strings(key)}
            </TagBase>
          ))}
        </Box>
      </Box>
      <Box twClassName="flex-1 min-h-[100px]">
        <Image
          source={backgroundImage}
          style={styles.backgroundImage}
          testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.BACKGROUND_IMAGE}
        />
      </Box>
      <Box twClassName="px-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center mt-4 mb-6"
        >
          {strings('earn.musd_conversion.education.description', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
      </Box>

      <Box twClassName="mx-4 mb-4 gap-2">
        <Button
          variant={ButtonVariant.Primary}
          onPress={handleContinue}
          size={ButtonSize.Lg}
          isFullWidth
          testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON}
        >
          {primaryButtonText}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          isFullWidth
          onPress={handleNotNow}
          testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.SECONDARY_BUTTON}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('earn.musd_conversion.education.secondary_button')}
          </Text>
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default EarnMusdConversionEducationView;
