import { useSelector } from 'react-redux';
import { selectTypedSignSimulationEnabled } from '../../../../selectors/signatureController';
import { RootState } from '../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { useSignatureRequest } from './useSignatureRequest';

export function useTypedSignSimulationEnabled() {
  const signatureRequest = useSignatureRequest();

  return useSelector((state: RootState) =>
    selectTypedSignSimulationEnabled(state, signatureRequest?.id as string)
  );
}
