// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
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
import StepperCard, {
  type StepperCardStep,
} from '../../../../component-library/components-temp/StepperCard';

// Internal dependencies.
import { ProfileCreateViewSelectorsIDs } from '../ProfileDrawer.testIds';
import { useProfileDrawerStyles } from '../ProfileDrawer.styles';

/**
 * Number of onboarding steps shown in the profile creation stepper.
 * Advancing past this count completes the stepper (see StepperCard).
 */
const PROFILE_CREATE_TOTAL_STEPS = 3;

/**
 * ProfileCreate — placeholder screen for the future social profile creation
 * flow (see docs/profile-drawer-design.md). Shows a 3-step onboarding stepper
 * as a UI-only preview; step progress is intentionally not persisted and
 * the screen only dismisses itself.
 */
const ProfileCreate: React.FC = () => {
  const styles = useProfileDrawerStyles();
  const navigation = useNavigation<AppNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const steps = useMemo((): StepperCardStep[] => {
    const goToNextStep = () => setCurrentStep((step) => step + 1);

    return [
      {
        title: strings('profile_drawer.profile_create.steps.step_1.title'),
        description: strings(
          'profile_drawer.profile_create.steps.step_1.description',
        ),
        image: require('../../../../images/branding/fox.png'),
        primaryCta: {
          text: strings('profile_drawer.profile_create.steps.next_cta'),
          onPress: goToNextStep,
        },
      },
      {
        title: strings('profile_drawer.profile_create.steps.step_2.title'),
        description: strings(
          'profile_drawer.profile_create.steps.step_2.description',
        ),
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
        image: require('../../../../images/branding/fox.png'),
        primaryCta: {
          text: strings('profile_drawer.profile_create.steps.get_started_cta'),
          // Advancing past the last step triggers StepperCard's onComplete.
          onPress: () => setCurrentStep(PROFILE_CREATE_TOTAL_STEPS),
        },
      },
    ];
  }, []);

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
