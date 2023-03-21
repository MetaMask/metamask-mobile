import { useEffect, useMemo } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { useAppConfig } from '../AppConfig';
import { createUpdateNeededNavDetails } from '../../UI/UpdateNeeded/UpdateNeeded';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';

const useMinimumVersions = () => {
  const allowAutomaticSecurityChecks = useSelector(
    (state: any) => state.security.automaticSecurityChecksEnabled,
  );
  const minimumValues = useAppConfig(allowAutomaticSecurityChecks);
  const currentBuildNumber = Number(getBuildNumber());
  const navigation = useNavigation();
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
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate(...createUpdateNeededNavDetails());
      });
    }
  }, [navigation, shouldTriggerUpdateFlow]);
};

export default useMinimumVersions;
