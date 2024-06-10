import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import Routes from '../../../constants/navigation/Routes';
import { setNftAutoDetectionModalOpen } from '../../../actions/security';

const useEnableNFTAutoDetection = () => {
  const useNftDetection = useSelector(selectUseNftDetection);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!useNftDetection) {
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.MODAL.NFT_AUTO_DETECTION_MODAL,
        });
        dispatch(setNftAutoDetectionModalOpen(true));
      });
    }
  }, [useNftDetection, navigation, dispatch]);
};

export default useEnableNFTAutoDetection;
