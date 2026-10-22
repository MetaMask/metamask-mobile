import React, { useEffect, useCallback, useMemo, type FC } from 'react';
import { Image, ScrollView, Platform, useWindowDimensions } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';
import { AccountStatusSelectorIDs } from './AccountStatus.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import Routes from '../../../constants/navigation/Routes';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  endTrace,
  trace,
  getTraceContext,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../core/Analytics/MetaMetrics.types';
import { getSocialAccountType } from '../../../constants/onboarding';
import { OnboardingScreenIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useNavigationPerformance } from '../../../hooks/performance/useNavigationPerformance';
import { useScreenPerformance } from '../../../hooks/performance/useScreenPerformance';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import WalletNotFoundImg from '../../../images/wallet-not-found.png';
import GoogleIcon from '../../../images/google.svg';
import AppleIcon from '../../../images/apple.svg';
import AppleWhiteIcon from '../../../images/apple-white.svg';
import MetaMaskFox from '../../../images/fox.svg';
import TelegramIcon from '@metamask/design-system-react-native/dist/components/Icon/assets/telegram.svg';
import type { AccountStatusParams } from './types';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { colors as commonColors } from '../../../styles/common';
import {
  AvatarFavicon,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize,
  TextColor,
  TextVariant,
  TitleStandard,
  type AvatarFaviconProps,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Images are exported at 3x and rendered at ~90% of their natural size.
const IMAGE_SCALE = 0.9;
const WALLET_NOT_FOUND_IMAGE_WIDTH = (1029 / 3) * IMAGE_SCALE;
const WALLET_NOT_FOUND_IMAGE_HEIGHT = (906 / 3) * IMAGE_SCALE;
const FOUND_AVATAR_CLASS_NAME =
  'h-[104px] w-[104px] border-2 border-muted bg-default';
const FOUND_AVATAR_OVERLAP_CLASS_NAME = `z-10 ml-[-22px] ${FOUND_AVATAR_CLASS_NAME}`;
const FOUND_AVATAR_OUTER_SIZE = 104;
const FOUND_AVATAR_IMAGE_SIZE = FOUND_AVATAR_OUTER_SIZE * 0.6666;

const withAvatarBorder = (
  props: AvatarFaviconProps,
  overlaps = false,
): AvatarFaviconProps => ({
  ...props,
  hasBorder: true,
  twClassName: overlaps
    ? FOUND_AVATAR_OVERLAP_CLASS_NAME
    : FOUND_AVATAR_CLASS_NAME,
  imageOrSvgProps: {
    ...props.imageOrSvgProps,
    width: FOUND_AVATAR_IMAGE_SIZE,
    height: FOUND_AVATAR_IMAGE_SIZE,
  },
});

type SocialLoginIcon = FC<SvgProps & { name: string }>;

const socialLoginIconSrc = (
  icon: SocialLoginIcon,
): NonNullable<AvatarFaviconProps['src']> =>
  icon as NonNullable<AvatarFaviconProps['src']>;

const getSocialLoginAvatarProps = (
  provider: string | undefined,
  isDark: boolean,
): AvatarFaviconProps => {
  const testID = AccountStatusSelectorIDs.ACCOUNT_FOUND_SOCIAL_AVATAR;

  switch (provider) {
    case AuthConnection.Google:
      return {
        src: socialLoginIconSrc(GoogleIcon),
        name: 'Google',
        testID,
      };
    case AuthConnection.Apple:
      return {
        src: socialLoginIconSrc(isDark ? AppleWhiteIcon : AppleIcon),
        name: 'Apple',
        testID,
      };
    case AuthConnection.Telegram:
      return {
        src: socialLoginIconSrc(TelegramIcon),
        name: 'Telegram',
        testID,
        imageOrSvgProps: {
          svgProps: {
            fill: 'currentColor',
            color: commonColors.telegramBlue,
          },
        },
      };
    default:
      return { name: 'Account', fallbackText: '?', testID };
  }
};

const WalletExistsHero = ({
  provider,
  isDark,
}: {
  provider?: string;
  isDark: boolean;
}) => (
  <Box
    testID={AccountStatusSelectorIDs.ACCOUNT_FOUND_HERO}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
  >
    <AvatarFavicon
      {...withAvatarBorder(getSocialLoginAvatarProps(provider, isDark))}
    />
    <AvatarFavicon
      {...withAvatarBorder(
        {
          src: socialLoginIconSrc(MetaMaskFox),
          name: 'MetaMask',
          testID: AccountStatusSelectorIDs.ACCOUNT_FOUND_FOX_AVATAR,
        },
        true,
      )}
    />
  </Box>
);

const ACCOUNT_STATUS_PRIMARY_FLOW = {
  EXISTING_ACCOUNT_IMPORT: 'import',
  NEW_ACCOUNT_CREATE: 'create',
} as const;

type AccountStatusPrimaryFlowMetric =
  (typeof ACCOUNT_STATUS_PRIMARY_FLOW)[keyof typeof ACCOUNT_STATUS_PRIMARY_FLOW];

interface AccountStatusRouteParams {
  AccountStatus: AccountStatusParams;
  AccountAlreadyExists: AccountStatusParams;
  AccountNotFound: AccountStatusParams;
  [key: string]: object | undefined;
}

interface AccountStatusProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const AccountStatus = ({ saveOnboardingEvent }: AccountStatusProps) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const route =
    useRoute<
      RouteProp<
        AccountStatusRouteParams,
        'AccountStatus' | 'AccountAlreadyExists' | 'AccountNotFound'
      >
    >();

  const {
    type = 'not_exist',
    accountName,
    oauthLoginSuccess,
    provider,
  } = route?.params ?? {};

  useNavigationPerformance({
    destinationScreenId:
      type === 'found'
        ? OnboardingScreenIds.ACCOUNT_ALREADY_EXISTS
        : OnboardingScreenIds.ACCOUNT_NOT_FOUND,
    destinationReady: true,
  });

  useScreenPerformance({
    screenId:
      type === 'found'
        ? OnboardingScreenIds.ACCOUNT_ALREADY_EXISTS
        : OnboardingScreenIds.ACCOUNT_NOT_FOUND,
    contentReady: true,
    isEmpty: false,
  });

  const isSmallScreen = windowWidth < 375;

  const accountType = useMemo(
    () =>
      provider ? getSocialAccountType(provider, type === 'found') : undefined,
    [provider, type],
  );

  const track = useCallback(
    (event: IMetaMetricsEvent, properties: JsonMap = {}) => {
      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(event)
          .addProperties(properties)
          .build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  useEffect(() => {
    const traceName =
      type === 'found'
        ? TraceName.OnboardingNewSocialAccountExists
        : TraceName.OnboardingExistingSocialAccountNotFound;

    // perf_fix: trace-registry-v1 — fetch parent from trace registry instead of route params
    const journeyCtx = getTraceContext({
      name: TraceName.OnboardingJourneyOverall,
    });
    trace({
      name: traceName,
      op: TraceOperation.OnboardingUserJourney,
      tags: getTraceTags(store.getState()),
      parentContext: journeyCtx,
    });

    track(
      type === 'found'
        ? MetaMetricsEvents.ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED
        : MetaMetricsEvents.ACCOUNT_NOT_FOUND_PAGE_VIEWED,
      accountType ? { account_type: accountType } : {},
    );

    return () => {
      endTrace({ name: traceName });
    };
  }, [accountType, type, track]);

  const navigateNextScreen = (
    targetRoute: string,
    previousScreen: string,
    metricFlow: AccountStatusPrimaryFlowMetric,
  ) => {
    const nextScenarioTraceName =
      type === 'found'
        ? TraceName.OnboardingExistingSocialLogin
        : TraceName.OnboardingNewSocialCreateWallet;
    // perf_fix: trace-registry-v1 — fetch parent from trace registry instead of route params
    const journeyCtx = getTraceContext({
      name: TraceName.OnboardingJourneyOverall,
    });
    trace({
      name: nextScenarioTraceName,
      op: TraceOperation.OnboardingUserJourney,
      tags: {
        ...getTraceTags(store.getState()),
        source: 'account_status_redirect',
      },
      parentContext: journeyCtx,
    });

    navigation.dispatch(
      StackActions.replace(targetRoute, {
        [PREVIOUS_SCREEN]: previousScreen,
        oauthLoginSuccess,
        provider,
      }),
    );
    track(
      metricFlow === ACCOUNT_STATUS_PRIMARY_FLOW.EXISTING_ACCOUNT_IMPORT
        ? MetaMetricsEvents.WALLET_IMPORT_STARTED
        : MetaMetricsEvents.WALLET_SETUP_STARTED,
      accountType ? { account_type: accountType } : {},
    );
  };

  const descriptionForFoundTypeAccountStatus = useCallback(() => {
    if (provider === AuthConnection.Telegram) {
      return 'account_status.account_already_exists_telegram_description';
    }
    if (Platform.OS === 'ios') {
      return 'account_status.account_already_exists_ios_new_user_description';
    }
    return 'account_status.account_already_exists_description';
  }, [provider]);

  const buttonLabelForFoundTypeAccountStatus = useCallback(() => {
    if (Platform.OS === 'ios') {
      return 'account_status.unlock_wallet';
    }
    return 'account_status.log_in';
  }, []);

  const descriptionForNotFoundTypeAccountStatus = useCallback(() => {
    if (provider === AuthConnection.Telegram) {
      return 'account_status.account_not_found_telegram_description';
    }
    return 'account_status.account_not_found_description';
  }, [provider]);

  const onPrimaryPress = () => {
    if (type === 'found') {
      navigateNextScreen(
        Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
        Routes.ONBOARDING.ONBOARDING,
        ACCOUNT_STATUS_PRIMARY_FLOW.EXISTING_ACCOUNT_IMPORT,
      );
      return;
    }
    navigateNextScreen(
      Routes.ONBOARDING.CHOOSE_PASSWORD,
      Routes.ONBOARDING.ONBOARDING,
      ACCOUNT_STATUS_PRIMARY_FLOW.NEW_ACCOUNT_CREATE,
    );
  };

  const buttonSize = isSmallScreen ? ButtonSize.Md : ButtonSize.Lg;
  const footerBottomClass = Platform.OS === 'ios' ? 'mb-4' : 'mb-6';

  return (
    <SafeAreaView
      edges={['bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={
        type === 'found'
          ? AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER
          : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER
      }
    >
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
      />
      <ScrollView
        style={[tw.style('flex-1'), { marginTop: headerInset }]}
        contentContainerStyle={tw.style('grow px-4')}
      >
        <TitleStandard
          title={
            type === 'found'
              ? strings('account_status.account_already_exists')
              : strings('account_status.account_not_found')
          }
          titleProps={{
            testID:
              type === 'found'
                ? AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE
                : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE,
          }}
          bottomLabel={strings(
            type === 'found'
              ? descriptionForFoundTypeAccountStatus()
              : descriptionForNotFoundTypeAccountStatus(),
            { accountName },
          )}
          bottomLabelProps={{
            variant: TextVariant.BodyMd,
            color: TextColor.TextAlternative,
          }}
        />
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full flex-1"
        >
          {type === 'found' ? (
            <WalletExistsHero provider={provider} isDark={isDark} />
          ) : (
            <Image
              source={WalletNotFoundImg}
              resizeMode="contain"
              style={tw.style('h-full w-full', {
                maxWidth: WALLET_NOT_FOUND_IMAGE_WIDTH,
                maxHeight: WALLET_NOT_FOUND_IMAGE_HEIGHT,
              })}
            />
          )}
        </Box>
      </ScrollView>

      <FooterGlass
        twClassName={footerBottomClass}
        primaryButtonProps={{
          children:
            type === 'found'
              ? strings(buttonLabelForFoundTypeAccountStatus())
              : strings('account_status.create_new_wallet'),
          size: buttonSize,
          onPress: onPrimaryPress,
          testID:
            type === 'found'
              ? AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON
              : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
        }}
        tertiaryButtonProps={{
          children: strings('account_status.use_different_login_method'),
          size: buttonSize,
          onPress: () => navigation.goBack(),
          testID:
            type === 'found'
              ? AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON
              : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_DIFFERENT_METHOD_BUTTON,
        }}
      />
    </SafeAreaView>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(AccountStatus);
