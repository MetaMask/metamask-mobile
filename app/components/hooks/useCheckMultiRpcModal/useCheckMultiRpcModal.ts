import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isObject } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import { useNavigation } from '../../../util/navigation/navUtils';
import { setMultiRpcMigrationModalOpen } from '../../../actions/security';
import { selectShowMultiRpcModal } from '../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

const useCheckMultiRpcModal = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const showMultiRpcModal = useSelector(selectShowMultiRpcModal);

  const isNetworkDuplicated = Object.values(networkConfigurations).some(
    (networkConfiguration) =>
      isObject(networkConfiguration) &&
      Array.isArray(networkConfiguration.rpcEndpoints) &&
      networkConfiguration.rpcEndpoints.length > 1,
  );

  const checkMultiRpcModal = useCallback(() => {
    if (showMultiRpcModal && isNetworkDuplicated) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.MULTI_RPC_MIGRATION_MODAL,
      });
      dispatch(setMultiRpcMigrationModalOpen(true));
    }
  }, [dispatch, showMultiRpcModal, navigation, isNetworkDuplicated]);

  useEffect(() => {
    checkMultiRpcModal();
  }, [checkMultiRpcModal]);
};

export default useCheckMultiRpcModal;
