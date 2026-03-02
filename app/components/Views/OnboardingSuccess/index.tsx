import React, { useCallback, useLayoutEffect } from 'react';
import { TouchableOpacity } from 'react-native';
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
  RouteProp,
  useNavigation,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingSuccessSelectorIDs } from './OnboardingSuccess.testIds';

import OnboardingSuccessEndAnimation from './OnboardingSuccessEndAnimation/index';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';

import Engine from '../../../core/Engine/Engine';
import { discoverAccounts } from '../../../multichain-accounts/discovery';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export const ResetNavigationToHome = CommonActions.reset({
  index: 0,
  routes: [{ name: 'HomeNav' }],
});

interface OnboardingSuccessProps {
  onDone: () => void;
  successFlow: ONBOARDING_SUCCESS_FLOW;
}

interface OnboardingSuccessRouteParams {
  successFlow?: ONBOARDING_SUCCESS_FLOW;
}

interface OnboardingSuccessParamList {
  OnboardingSuccess: OnboardingSuccessRouteParams;
  [key: string]: object | undefined;
}

interface OnboardingSuccessScreenProps {
  route?: RouteProp<OnboardingSuccessParamList, 'OnboardingSuccess'>;
}

export const OnboardingSuccessComponent: React.FC<OnboardingSuccessProps> = ({
  onDone,
  successFlow,
}) => {
  const navigation = useNavigation();

  const tw = useTailwind();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.DEFAULT_SETTINGS);
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
      <Text
        variant={TextVariant.DisplayMD}
        style={tw.style('mt-[25px] mb-4 mx-4 text-center', {
          fontFamily: 'MMSans-Regular',
        })}
      >
        {getTitleString()}
      </Text>
    </>
  );

  const renderFooter = () => {
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={goToDefaultSettings}
        testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
        style={tw.style('py-2 items-center')}
      >
        <Text color={TextColor.Info} variant={TextVariant.BodyMDMedium}>
          {strings('onboarding_success.manage_default_settings')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        twClassName="flex-1 px-4"
        testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
        >
          {renderContent()}
        </Box>

        <Box alignItems={BoxAlignItems.Center} twClassName="pb-1 gap-y-3">
          <Button
            testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
            label={strings('onboarding_success.done')}
            variant={ButtonVariants.Primary}
            onPress={handleOnDone}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
          />
          {renderFooter()}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export const OnboardingSuccess = ({ route }: OnboardingSuccessScreenProps) => {
  const navigation = useNavigation();
  const successFlow =
    route?.params?.successFlow ?? ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP;
  const nextScreen = ResetNavigationToHome;

  return (
    <OnboardingSuccessComponent
      successFlow={successFlow}
      onDone={() => navigation.dispatch(nextScreen)}
    />
  );
};

export default OnboardingSuccess;
