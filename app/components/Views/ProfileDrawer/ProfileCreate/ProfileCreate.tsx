// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderBase,
  IconName,
} from '@metamask/design-system-react-native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import StepperCard, {
  type StepperCardStep,
} from '../../../../component-library/components-temp/StepperCard';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import {
  connectX,
  disconnectX,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';
import {
  selectIsConnectedToX,
  selectProfile,
  selectXProfile,
} from '../../../../selectors/profileController';

// Internal dependencies.
import { ProfileCreateViewSelectorsIDs } from '../ProfileDrawer.testIds';
import { useProfileDrawerStyles } from '../ProfileDrawer.styles';

/**
 * Number of onboarding steps shown in the profile creation stepper.
 * Advancing past this count completes the stepper (see StepperCard).
 */
const PROFILE_CREATE_TOTAL_STEPS = 3;

/**
 * Coerces an unknown thrown value to an Error so it can be passed to
 * Logger.error (which requires an Error) without unsafe casts.
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Flow logging for developer debugging in Metro/console output
 * (console.log in __DEV__, Sentry breadcrumb in production for opted-in
 * users). SECURITY: never log tokens, error messages, or client ids —
 * metadata only.
 */
const log = (
  message: string,
  data?: Record<string, string | number | boolean | undefined>,
) => Logger.log(`[XAuth][ProfileCreate] ${message}`, data ?? '');

/**
 * Safe metadata for logging caught errors: the error class name and, for
 * XAuthError, its OAuth error type. Never the full message.
 */
function logErrorMetadata(
  error: unknown,
): Record<string, string | number | boolean | undefined> {
  return {
    errorName: error instanceof Error ? error.name : 'unknown',
    errorType: error instanceof XAuthError ? error.type : undefined,
  };
}

/**
 * ProfileCreate — profile creation onboarding flow (see
 * docs/profile-drawer-design.md). Step 1 connects the user's X (Twitter)
 * account through the backend-mediated X connect flow in XAuthService
 * (skipped when X is already connected); steps 2–3 preview the remaining
 * onboarding. Step progress is intentionally not persisted and the screen
 * only dismisses itself.
 */
const ProfileCreate: React.FC = () => {
  const styles = useProfileDrawerStyles();
  const navigation = useNavigation<AppNavigationProp>();
  const { toastRef } = useContext(ToastContext);
  const isConnected = useSelector(selectIsConnectedToX);
  const profile = useSelector(selectProfile);
  const xProfile = useSelector(selectXProfile);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const isConnectingRef = useRef(false);
  const isDisconnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    log('mount X connection state', {
      connected: isConnected,
      hasProfile: Boolean(profile),
      hasXProfile: Boolean(xProfile),
    });
    return () => {
      isMountedRef.current = false;
    };
    // Mount-only: snapshot diagnostics for the selector-driven connection
    // state; the unmount cleanup guards state updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConnectX = useCallback(async () => {
    // Double-press guard: the CTA is also disabled while connecting, but
    // a rapid second tap can re-enter before the disabled state commits.
    if (isConnectingRef.current) {
      log('Connect X press ignored: connect already in flight');
      return;
    }
    isConnectingRef.current = true;
    log('Connect X pressed');
    if (isMountedRef.current) {
      setIsConnecting(true);
    }

    try {
      // The backend creates the profile during the X connect when it does
      // not exist yet, so no profile is required up front.
      const { profileCreated } = await connectX();
      log('X connect succeeded, advancing to step 2', { profileCreated });
      if (isMountedRef.current) {
        // isConnected updates via the ProfileController state change
        // propagated through Redux.
        setCurrentStep((step) => step + 1);
      }
    } catch (error) {
      // A user cancellation or consent denial is not an error — stay on
      // step 1 silently.
      if (
        error instanceof XAuthError &&
        error.type === XAuthErrorType.UserCancelled
      ) {
        log('X connect cancelled by user, staying on step 1', {
          errorType: error.type,
        });
        return;
      }
      log('X connect failed, showing toast', logErrorMetadata(error));
      Logger.error(toError(error), 'ProfileCreate: X connect failed');
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: strings(
              'profile_drawer.profile_create.connect_x.error_toast',
            ),
          },
        ],
        hasNoTimeout: false,
      });
    } finally {
      isConnectingRef.current = false;
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, [toastRef]);

  /**
   * Dev-only affordance (see the step 1 secondaryCta): disconnects the X
   * account via ProfileController so the connect flow can be re-tested in
   * development builds.
   */
  const handleDisconnectX = useCallback(async () => {
    // Double-press guard, same as the connect CTA.
    if (isDisconnectingRef.current) {
      log('Disconnect X press ignored: disconnect already in flight');
      return;
    }
    isDisconnectingRef.current = true;
    log('Disconnect X pressed');
    if (isMountedRef.current) {
      setIsDisconnecting(true);
    }

    try {
      await disconnectX();
      log('X disconnect succeeded');
    } catch (error) {
      log('X disconnect failed, showing toast', logErrorMetadata(error));
      Logger.error(toError(error), 'ProfileCreate: X disconnect failed');
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: strings(
              'profile_drawer.profile_create.connect_x.disconnect_error_toast',
            ),
          },
        ],
        hasNoTimeout: false,
      });
    } finally {
      isDisconnectingRef.current = false;
      if (isMountedRef.current) {
        setIsDisconnecting(false);
      }
    }
  }, [toastRef]);

  const steps = useMemo((): StepperCardStep[] => {
    const goToNextStep = () => setCurrentStep((step) => step + 1);

    return [
      {
        title: strings('profile_drawer.profile_create.steps.step_1.title'),
        description: isConnected
          ? strings(
              'profile_drawer.profile_create.connect_x.connected_description',
            )
          : strings('profile_drawer.profile_create.steps.step_1.description'),
        /* eslint-disable-next-line @typescript-eslint/no-require-imports */
        image: require('../../../../images/branding/fox.png'),
        primaryCta: isConnected
          ? {
              text: strings('profile_drawer.profile_create.steps.next_cta'),
              onPress: goToNextStep,
              disabled: isDisconnecting,
            }
          : {
              text: isConnecting
                ? strings('profile_drawer.profile_create.connect_x.connecting')
                : strings('profile_drawer.profile_create.connect_x.cta'),
              onPress: handleConnectX,
              disabled: isConnecting,
            },
        // Dev-only affordance: clears locally stored X tokens (no
        // server-side revocation) so the connect flow can be re-tested
        // in development builds. Never rendered in production.
        secondaryCta:
          __DEV__ && isConnected
            ? {
                text: strings(
                  'profile_drawer.profile_create.connect_x.disconnect_cta',
                ),
                onPress: handleDisconnectX,
                disabled: isDisconnecting,
              }
            : undefined,
      },
      {
        title: strings('profile_drawer.profile_create.steps.step_2.title'),
        description: strings(
          'profile_drawer.profile_create.steps.step_2.description',
        ),
        /* eslint-disable-next-line @typescript-eslint/no-require-imports */
        image: require('../../../../images/branding/fox.png'),
        primaryCta: {
          text: strings('profile_drawer.profile_create.steps.next_cta'),
          onPress: goToNextStep,
        },
      },
      {
        title: strings('profile_drawer.profile_create.steps.step_3.title'),
        description: strings(
          'profile_drawer.profile_create.steps.step_3.description',
        ),
        /* eslint-disable-next-line @typescript-eslint/no-require-imports */
        image: require('../../../../images/branding/fox.png'),
        primaryCta: {
          text: strings('profile_drawer.profile_create.steps.get_started_cta'),
          // Advancing past the last step triggers StepperCard's onComplete.
          onPress: () => setCurrentStep(PROFILE_CREATE_TOTAL_STEPS),
        },
      },
    ];
  }, [
    isConnected,
    isConnecting,
    isDisconnecting,
    handleConnectX,
    handleDisconnectX,
  ]);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.screen}
      testID={ProfileCreateViewSelectorsIDs.CONTAINER}
    >
      <HeaderBase
        includesTopInset
        startAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={ProfileCreateViewSelectorsIDs.CLOSE_BUTTON}
            accessibilityLabel={strings('profile_drawer.close')}
            accessibilityRole="button"
          />
        }
      />
      <Box twClassName="mx-4 mt-2">
        <StepperCard
          steps={steps}
          currentStep={currentStep}
          onComplete={handleClose}
          testID={ProfileCreateViewSelectorsIDs.STEPPER}
        />
      </Box>
    </SafeAreaView>
  );
};

export default React.memo(ProfileCreate);
