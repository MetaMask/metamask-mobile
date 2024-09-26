import { useEffect } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { createUpdateNeededNavDetails } from '../../UI/UpdateNeeded/UpdateNeeded';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { FeatureFlagsState } from '../../../core/redux/slices/featureFlags';
import { SecurityState } from '../../../../app/reducers/security';

const useMinimumVersions = () => {
  const allowAutomaticSecurityChecks = useSelector(
    (state: SecurityState) => state.automaticSecurityChecksEnabled,
  );
  const { appMinimumBuild } = useSelector(
    (state: FeatureFlagsState) => state.featureFlags.mobileMinimumVersions,
  );
  const currentBuildNumber = Number(getBuildNumber());
  const navigation = useNavigation();
  const shouldTriggerUpdateFlow =
    allowAutomaticSecurityChecks && appMinimumBuild > currentBuildNumber;

  useEffect(() => {
    if (shouldTriggerUpdateFlow) {
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate(...createUpdateNeededNavDetails());
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);
};

export default useMinimumVersions;
