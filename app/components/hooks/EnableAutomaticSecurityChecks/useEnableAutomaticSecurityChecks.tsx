import { useEffect } from 'react';
import { createEnableAutomaticSecurityChecksModalNavDetails } from '../../UI/EnableAutomaticSecurityChecksModal/EnableAutomaticSecurityChecksModal';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

const useEnableAutomaticSecurityChecks = () => {
  const hasUserSelectedAutomaticSecurityCheckOption = useSelector(
    (state: any) => state.security.hasUserSelectedAutomaticSecurityCheckOption,
  );

  const navigation = useNavigation();

  useEffect(() => {
    if (hasUserSelectedAutomaticSecurityCheckOption === false) {
      navigation.navigate(
        ...createEnableAutomaticSecurityChecksModalNavDetails(),
      );
    }
  });
};

export default useEnableAutomaticSecurityChecks;
