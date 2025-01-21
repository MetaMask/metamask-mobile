import { DecodingDataStateChange, SignatureRequest } from '@metamask/signature-controller';

enum DecodingResponseType {
  Change = 'CHANGE',
  NoChange = 'NO_CHANGE',
  Loading = 'decoding_in_progress',
}

export const getSignatureDecodingEventProps = (signatureRequest?: SignatureRequest, isDecodingAPIEnabled: boolean = false) => {
  const { decodingData, decodingLoading } = signatureRequest || {};

  if (!isDecodingAPIEnabled || !decodingData) {
    return {};
  }

  const { stateChanges, error } = decodingData;

  const changeTypes = (stateChanges ?? []).map(
    (change: DecodingDataStateChange) => change.changeType,
  );

  const responseType = error?.type ??
    (changeTypes.length
      ? DecodingResponseType.Change
      : DecodingResponseType.NoChange);

  return {
    decoding_change_types: changeTypes,
    decoding_description: decodingData?.error?.message ?? null,
    decoding_response: decodingLoading
      ? DecodingResponseType.Loading
      : responseType,
  };
};
