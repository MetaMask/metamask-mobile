import { useEffect } from 'react';
import { createEnableAutomaticSecurityChecksModalNavDetails } from '../../UI/EnableAutomaticSecurityChecksModal/EnableAutomaticSecurityChecksModal';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';

const useEnableAutomaticSecurityChecks = () => {
  const hasUserSelectedAutomaticSecurityCheckOption = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security.hasUserSelectedAutomaticSecurityCheckOption,
  );

  const navigation = useNavigation();

  useEffect(() => {
    if (hasUserSelectedAutomaticSecurityCheckOption === false) {
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate(
          ...createEnableAutomaticSecurityChecksModalNavDetails(),
        );
      });
    }
  }, [hasUserSelectedAutomaticSecurityCheckOption, navigation]);
};

export default useEnableAutomaticSecurityChecks;
