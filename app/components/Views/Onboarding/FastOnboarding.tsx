import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';

export default function FastOnboarding(props: {
  onPressContinueWithGoogle: (createWallet: boolean) => void;
  onPressContinueWithApple: (createWallet: boolean) => void;
  onPressImport: () => void;
  onPressCreate: () => void;
}) {
  const { params } =
    useRoute<
      RouteProp<
        { params: { onboardingType?: string; existing?: string } },
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
    (onboardingType: string, existing: boolean) => {
      switch (onboardingType) {
        case 'google':
          onPressContinueWithGoogle(!existing);
          break;
        case 'apple':
          onPressContinueWithApple(!existing);
          break;
        case 'srp':
          if (existing) onPressImport();
          else onPressCreate();
          break;
      }
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
    const existing = params?.existing;

    if (onboardingType) {
      handleFastOnboarding(onboardingType, existing === 'true');
    }
  }, [params, handleFastOnboarding]);

  return null;
}
