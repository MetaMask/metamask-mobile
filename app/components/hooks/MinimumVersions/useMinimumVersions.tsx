import { useEffect } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { createUpdateNeededNavDetails } from '../../UI/UpdateNeeded/UpdateNeeded';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { InteractionManager } from 'react-native';
import { RootState } from '../../../reducers';
import { selectAppMinimumBuild } from '../../../selectors/featureFlagController/minimumAppVersion';
import { navigateWithDetails } from '../../../util/navigation/navUtils';

const useMinimumVersions = () => {
  const appMinimumBuild = useSelector((state: RootState) =>
    selectAppMinimumBuild(state),
  );
  const currentBuildNumber = Number(getBuildNumber());
  const navigation = useNavigation<AppNavigationProp>();
  const shouldTriggerUpdateFlow = appMinimumBuild > currentBuildNumber;

  useEffect(() => {
    if (shouldTriggerUpdateFlow) {
      InteractionManager.runAfterInteractions(() => {
        navigateWithDetails(navigation, createUpdateNeededNavDetails());
      });
    }
  }, [navigation, shouldTriggerUpdateFlow]);
};

export default useMinimumVersions;
