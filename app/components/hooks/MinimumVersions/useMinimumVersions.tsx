import { useEffect, useMemo } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { useAppConfig } from '../AppConfig';
import { createUpdateNeededNavDetails } from '../../UI/UpdateNeeded/UpdateNeeded';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

const useMinimumVersions = () => {
  const minimumValues = useAppConfig();
  const currentBuildNumber = Number(getBuildNumber());
  const navigation = useNavigation();
  const allowAutomaticSecurityChecks = useSelector(
    (state: any) => state.security.automaticSecurityChecksEnabled,
  );
  const shouldTriggerUpdateFlow = useMemo(
    () =>
      !!(
        allowAutomaticSecurityChecks &&
        minimumValues.data &&
        minimumValues.data.security.minimumVersions.appMinimumBuild >
          currentBuildNumber
      ),
    [allowAutomaticSecurityChecks, currentBuildNumber, minimumValues.data],
  );

  useEffect(() => {
    if (shouldTriggerUpdateFlow) {
      navigation.navigate(...createUpdateNeededNavDetails());
    }
  }, [navigation, shouldTriggerUpdateFlow]);
};

export default useMinimumVersions;
