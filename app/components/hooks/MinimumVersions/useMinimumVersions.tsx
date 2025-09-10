import { useEffect } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { RootState } from '../../../reducers';
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
        navigation.navigate('UpdateNeededModal');
      });
    }
  }, [navigation, shouldTriggerUpdateFlow]);
};

export default useMinimumVersions;
