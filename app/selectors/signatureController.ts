import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import { MessageParamsTyped, SignatureRequest, SignatureRequestType } from '@metamask/signature-controller';
import { selectUseTransactionSimulations } from './preferencesController';
import { isRecognizedPermit } from '../components/Views/confirmations/utils/signature';
import { isNonPermitSupportedByDecodingAPI } from '../components/Views/confirmations/utils/signatureDecoding';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectSignatureControllerState = (state: RootState) =>
  state.engine.backgroundState.SignatureController;

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

export const selectTypedSignSimulationEnabled = createDeepEqualSelector(
  [selectSignatureRequestById, selectUseTransactionSimulations],
  (signatureRequest, useTransactionSimulations) => {
    if (!signatureRequest) {
      return undefined;
    }

    const requestType = signatureRequest.type;
    const signatureMethod = (signatureRequest.messageParams as MessageParamsTyped)?.version;

    const isTypedSignV3V4 = requestType === SignatureRequestType.TypedSign && (
      signatureMethod === SignTypedDataVersion.V3 ||
      signatureMethod === SignTypedDataVersion.V4
    );
    const isPermit = isRecognizedPermit(signatureRequest);

    const nonPermitSupportedByDecodingAPI: boolean =
      isTypedSignV3V4 && isNonPermitSupportedByDecodingAPI(signatureRequest);

    return (
      useTransactionSimulations &&
      isTypedSignV3V4 &&
      (isPermit || nonPermitSupportedByDecodingAPI)
    );
  }
);
