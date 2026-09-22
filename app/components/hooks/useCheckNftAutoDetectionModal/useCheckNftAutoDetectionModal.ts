import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';

import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { isMainNet } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import { setNftAutoDetectionModalOpen } from '../../../actions/security';
import { RootState } from '../../../reducers';
import { selectChainId } from '../../../selectors/networkController';
import { selectIsInBasicFunctionalityConsolidationRollout } from '../../../selectors/featureFlagController/basicFunctionalityConsolidation';

const useCheckNftAutoDetectionModal = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const useNftDetection = useSelector(selectUseNftDetection);
  const chainId = useSelector(selectChainId);
  const isNFTAutoDetectionModalViewed = useSelector(
    (state: RootState) => state.security.isNFTAutoDetectionModalViewed,
  );
  // Mixed and social-restore wallets still have `useNftDetection` off until
  // consolidateBasicFunctionality finishes, which would otherwise race the
  // migration sheet on ROOT_MODAL_FLOW. Enrolled wallets stay suppressed even
  // once the enrollment flag reads false, because NFT autodetection is no
  // longer a control they can act on from this prompt.
  const isBasicFunctionalityConsolidationRolloutEnabled = useSelector(
    selectIsInBasicFunctionalityConsolidationRollout,
  );

  const checkNftAutoDetectionModal = useCallback(() => {
    if (isBasicFunctionalityConsolidationRolloutEnabled) {
      return;
    }

    const isOnMainnet = isMainNet(chainId);
    if (!useNftDetection && isOnMainnet && !isNFTAutoDetectionModalViewed) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.NFT_AUTO_DETECTION_MODAL,
      });
      dispatch(setNftAutoDetectionModalOpen(true));
    }
  }, [
    dispatch,
    isBasicFunctionalityConsolidationRolloutEnabled,
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
