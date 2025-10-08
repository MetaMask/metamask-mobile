import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';

export default function FastOnboarding(props: {
  onPressContinueWithGoogle: () => void;
  onPressContinueWithApple: () => void;
  onPressImport: () => void;
}) {
  const { params } =
    useRoute<RouteProp<{ params: { onboardingType?: string } }, 'params'>>();
  const navigation = useNavigation();

  const handleOnboardingDeeplink = useCallback(
    (onboardingType: string) => {
      const {
        onPressContinueWithGoogle,
        onPressContinueWithApple,
        onPressImport,
      } = props;
      navigation.setParams({ ...params, onboardingType: undefined });

      switch (onboardingType) {
        case 'google':
          onPressContinueWithGoogle();
          break;
        case 'apple':
          onPressContinueWithApple();
          break;
        case 'import_srp':
          onPressImport();
          break;
      }
    },
    [props, navigation, params],
  );

  useEffect(() => {
    const onboardingType = params?.onboardingType;

    if (onboardingType) {
      handleOnboardingDeeplink(onboardingType);
    }
  }, [params, handleOnboardingDeeplink]);

  return null;
}
