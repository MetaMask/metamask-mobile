import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';

interface FastOnboardingParamList {
  params: { onboardingType?: string; existing?: string };
  [key: string]: object | undefined;
}

export default function FastOnboarding(props: {
  onPressContinueWithGoogle: (createWallet: boolean) => void;
  onPressContinueWithApple: (createWallet: boolean) => void;
  onPressImport: () => void;
  onPressCreate: () => void;
}) {
  const navigation =
    useNavigation<NavigationProp<FastOnboardingParamList, 'params'>>();
  const { params } = useRoute<RouteProp<FastOnboardingParamList, 'params'>>();
  const consumedOnboardingParamsRef = useRef<string | null>(null);
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

    if (!onboardingType) {
      consumedOnboardingParamsRef.current = null;
      return;
    }

    const onboardingParamsKey = `${onboardingType}:${existing ?? ''}`;
    if (consumedOnboardingParamsRef.current === onboardingParamsKey) {
      return;
    }

    consumedOnboardingParamsRef.current = onboardingParamsKey;
    navigation.setParams({
      onboardingType: undefined,
      existing: undefined,
    });
    handleFastOnboarding(onboardingType, existing === 'true');
  }, [params, handleFastOnboarding, navigation]);

  return null;
}
