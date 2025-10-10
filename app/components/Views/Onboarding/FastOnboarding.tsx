import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';

export default function FastOnboarding(props: {
  onPressContinueWithGoogle: (createWallet: boolean) => void;
  onPressContinueWithApple: (createWallet: boolean) => void;
  onPressImport: () => void;
  onPressCreate: () => void;
}) {
  const { params } =
    useRoute<
      RouteProp<
        { params: { onboardingType?: string; existingUser?: string } },
        'params'
      >
    >();
  const {
    onPressContinueWithGoogle,
    onPressContinueWithApple,
    onPressImport,
    onPressCreate,
  } = props;

  const handleFastOnboarding = useCallback(
    (onboardingType: string, existingUser: boolean) => {
      InteractionManager.runAfterInteractions(() => {
        switch (onboardingType) {
          case 'google':
            onPressContinueWithGoogle(!existingUser);
            break;
          case 'apple':
            onPressContinueWithApple(!existingUser);
            break;
          case 'srp':
            if (existingUser) onPressImport();
            else onPressCreate();
            break;
        }
      });
    },
    [
      onPressContinueWithGoogle,
      onPressContinueWithApple,
      onPressImport,
      onPressCreate,
    ],
  );

  useEffect(() => {
    const onboardingType = params?.onboardingType;
    const existingUser = params?.existingUser;

    if (onboardingType) {
      handleFastOnboarding(onboardingType, existingUser === 'true');
    }
  }, [params, handleFastOnboarding]);

  return null;
}
