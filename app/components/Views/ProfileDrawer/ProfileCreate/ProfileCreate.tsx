// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  isXConnected,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';

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
 * ProfileCreate — profile creation onboarding flow (see
 * docs/profile-drawer-design.md). Step 1 connects the user's X (Twitter)
 * account through XAuthService's OAuth PKCE flow (skipped when X is
 * already connected); steps 2–3 preview the remaining onboarding.
 * Step progress is intentionally not persisted and the screen only
 * dismisses itself.
 */
const ProfileCreate: React.FC = () => {
  const styles = useProfileDrawerStyles();
  const navigation = useNavigation<AppNavigationProp>();
  const { toastRef } = useContext(ToastContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isXConnected()
      .then((connected) => {
        if (isMountedRef.current) {
          setIsConnected(connected);
        }
      })
      .catch(() => {
        // isXConnected resolves false on keychain read failures;
        // nothing to do.
      });
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConnectX = useCallback(async () => {
    // Double-press guard: the CTA is also disabled while connecting, but
    // a rapid second tap can re-enter before the disabled state commits.
    if (isConnectingRef.current) {
      return;
    }
    isConnectingRef.current = true;
    if (isMountedRef.current) {
      setIsConnecting(true);
    }

    try {
      await connectX();
      if (isMountedRef.current) {
        setIsConnected(true);
        setCurrentStep((step) => step + 1);
      }
    } catch (error) {
      // A user cancellation or consent denial is not an error — stay on
      // step 1 silently.
      if (
        !(
          error instanceof XAuthError &&
          error.type === XAuthErrorType.UserCancelled
        )
      ) {
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
      }
    } finally {
      isConnectingRef.current = false;
      if (isMountedRef.current) {
        setIsConnecting(false);
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
            }
          : {
              text: isConnecting
                ? strings('profile_drawer.profile_create.connect_x.connecting')
                : strings('profile_drawer.profile_create.connect_x.cta'),
              onPress: handleConnectX,
              disabled: isConnecting,
            },
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
  }, [isConnected, isConnecting, handleConnectX]);

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
