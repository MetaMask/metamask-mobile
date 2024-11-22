import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { isMainNet } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import { setNftAutoDetectionModalOpen } from '../../../actions/security';
import { RootState } from '../../../reducers';
import { selectProviderConfig } from '../../../selectors/networkController';

const useCheckNftAutoDetectionModal = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const useNftDetection = useSelector(selectUseNftDetection);
  const providerConfig = useSelector(selectProviderConfig);
  const isNFTAutoDetectionModalViewed = useSelector(
    (state: RootState) => state.security.isNFTAutoDetectionModalViewed,
  );

  const checkNftAutoDetectionModal = useCallback(() => {
    const isOnMainnet = isMainNet(providerConfig.chainId);
    if (!useNftDetection && isOnMainnet && !isNFTAutoDetectionModalViewed) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.NFT_AUTO_DETECTION_MODAL,
      });
      dispatch(setNftAutoDetectionModalOpen(true));
    }
  }, [
    dispatch,
    isNFTAutoDetectionModalViewed,
    navigation,
    providerConfig.chainId,
    useNftDetection,
  ]);

  useEffect(() => {
    checkNftAutoDetectionModal();
  }, [checkNftAutoDetectionModal]);
};

export default useCheckNftAutoDetectionModal;
