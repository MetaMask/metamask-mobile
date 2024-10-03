import { useEffect } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { createUpdateNeededNavDetails } from '../../UI/UpdateNeeded/UpdateNeeded';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { FeatureFlagsState } from '../../../core/redux/slices/featureFlags';
import { SecurityState } from '../../../../app/reducers/security';
import { RootState } from '../../../../app/reducers';

const useMinimumVersions = () => {
  const { automaticSecurityChecksEnabled }: SecurityState = useSelector(
    (state: RootState) => state.security,
  );
  const { featureFlags }: FeatureFlagsState = useSelector(
    (state: RootState) => state.featureFlags,
  );
  const currentBuildNumber = Number(getBuildNumber());
  const navigation = useNavigation();
  const shouldTriggerUpdateFlow =
    automaticSecurityChecksEnabled &&
    featureFlags?.mobileMinimumVersions?.appMinimumBuild > currentBuildNumber;

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
