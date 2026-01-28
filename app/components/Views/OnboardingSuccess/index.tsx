import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { useTheme } from '../../../util/theme';
import { OnboardingSuccessSelectorIDs } from './OnboardingSuccess.testIds';

import createStyles from './index.styles';
import OnboardingSuccessEndAnimation from './OnboardingSuccessEndAnimation/index';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';

import Engine from '../../../core/Engine/Engine';
import { discoverAccounts } from '../../../multichain-accounts/discovery';

export const ResetNavigationToHome = CommonActions.reset({
  index: 0,
  routes: [{ name: 'HomeNav' }],
});

interface OnboardingSuccessProps {
  onDone: () => void;
  successFlow: ONBOARDING_SUCCESS_FLOW;
}

export const OnboardingSuccessComponent: React.FC<OnboardingSuccessProps> = ({
  onDone,
  successFlow,
}) => {
  const navigation = useNavigation();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  };

  const handleOnDone = useCallback(() => {
    const onOnboardingSuccess = async () => {
      // Run discovery on all account providers (EVM and non-EVM)
      await discoverAccounts(
        Engine.context.KeyringController.state.keyrings[0].metadata.id,
      );
    };
    onOnboardingSuccess();
    onDone();
  }, [onDone]);

  const getTitleString = () => {
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return strings('onboarding_success.title');
    }
    return strings('onboarding_success.wallet_ready');
  };

  const renderContent = () => (
    <>
      <OnboardingSuccessEndAnimation
        onAnimationComplete={() => {
          // No-op: Animation completion not needed in success mode
        }}
      />
      <Text variant={TextVariant.DisplayMD} style={styles.textTitle}>
        {getTitleString()}
      </Text>
    </>
  );

  const renderFooter = () => {
    // Hide default settings for settings backup flow
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={goToDefaultSettings}
        testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
        style={styles.footerLink}
      >
        <Text color={TextColor.Info} variant={TextVariant.BodyMDMedium}>
          {strings('onboarding_success.manage_default_settings')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.root}>
      <View
        style={styles.container}
        testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
      >
        <View style={styles.animationSection}>{renderContent()}</View>

        <View style={styles.buttonSection}>
          <Button
            testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
            label={strings('onboarding_success.done')}
            variant={ButtonVariants.Primary}
            onPress={handleOnDone}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
          />
          {renderFooter()}
        </View>
      </View>
    </SafeAreaView>
  );
};

export const OnboardingSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { successFlow: ONBOARDING_SUCCESS_FLOW };

  const successFlow = params?.successFlow;
  const nextScreen = ResetNavigationToHome;

  return (
    <OnboardingSuccessComponent
      successFlow={successFlow}
      onDone={() => navigation.dispatch(nextScreen)}
    />
  );
};

export default OnboardingSuccess;
