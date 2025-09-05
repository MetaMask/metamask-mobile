import { useEffect } from 'react';
import { getBuildNumber } from 'react-native-device-info';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { RootState } from '../../../reducers';
import { selectAppMinimumBuild } from '../../../selectors/featureFlagController/minimumAppVersion';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { NavigatableRootParamList } from '../../../util/navigation';

const useMinimumVersions = () => {
  const appMinimumBuild = useSelector((state: RootState) =>
    selectAppMinimumBuild(state),
  );
  const currentBuildNumber = Number(getBuildNumber());
  const navigation =
    useNavigation<StackNavigationProp<NavigatableRootParamList>>();
  const shouldTriggerUpdateFlow = appMinimumBuild > currentBuildNumber;

  useEffect(() => {
    if (shouldTriggerUpdateFlow) {
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate('RootModalFlow', {
          screen: 'UpdateNeededModal',
        });
      });
    }
  }, [navigation, shouldTriggerUpdateFlow]);
};

export default useMinimumVersions;
