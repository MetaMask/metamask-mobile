import { useEffect } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { createUpdateNeededNavDetails } from '../../UI/UpdateNeeded/UpdateNeeded';
import { useSelector } from 'react-redux';
import { InteractionManager } from 'react-native';
import { RootState } from '../../../reducers';
import { useNavigation } from '../../../util/navigation/navUtils';
import { selectAppMinimumBuild } from '../../../selectors/featureFlagController/minimumAppVersion';

const useMinimumVersions = () => {
  const appMinimumBuild = useSelector((state: RootState) =>
    selectAppMinimumBuild(state),
  );
  const currentBuildNumber = Number(getBuildNumber());
  const navigation = useNavigation();
  const shouldTriggerUpdateFlow = appMinimumBuild > currentBuildNumber;

  useEffect(() => {
    if (shouldTriggerUpdateFlow) {
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate(...createUpdateNeededNavDetails());
      });
    }
  }, [navigation, shouldTriggerUpdateFlow]);
};

export default useMinimumVersions;
