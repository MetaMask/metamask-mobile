import { SignatureRequest } from '@metamask/signature-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectSignatureControllerState = (state: RootState) => {
  console.log('selectSignatureControllerState', state.engine.backgroundState.SignatureController);

  return state.engine.backgroundState.SignatureController;
}

export const selectSignatureRequests = createDeepEqualSelector(
  (state: RootState) => selectSignatureControllerState(state).signatureRequests,
  (signatureRequests) => signatureRequests as Record<string, SignatureRequest>,
);

export const selectSignatureRequestById = createDeepEqualSelector(
  selectSignatureRequests,
  (_: RootState, id: string) => id,
  (signatureRequests, id) =>
    signatureRequests[id] as SignatureRequest | undefined,
);
