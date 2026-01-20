import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { useNavigation } from '../../../util/navigation/navUtils';
import { isMainNet } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import { setNftAutoDetectionModalOpen } from '../../../actions/security';
import { RootState } from '../../../reducers';
import { selectChainId } from '../../../selectors/networkController';

const useCheckNftAutoDetectionModal = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const useNftDetection = useSelector(selectUseNftDetection);
  const chainId = useSelector(selectChainId);
  const isNFTAutoDetectionModalViewed = useSelector(
    (state: RootState) => state.security.isNFTAutoDetectionModalViewed,
  );

  const checkNftAutoDetectionModal = useCallback(() => {
    const isOnMainnet = isMainNet(chainId);
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
    chainId,
    useNftDetection,
  ]);

  useEffect(() => {
    checkNftAutoDetectionModal();
  }, [checkNftAutoDetectionModal]);
};

export default useCheckNftAutoDetectionModal;
