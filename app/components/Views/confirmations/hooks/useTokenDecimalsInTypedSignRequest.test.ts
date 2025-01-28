import { renderHook } from '@testing-library/react-hooks';

import { typedSignV4SignatureRequest } from '../../../../util/test/confirm-data-helpers';
import { DataTreeInput } from '../components/Confirm/DataTree/DataTree';
import { parseSanitizeTypedDataMessage } from '../utils/signatures';
import { useTokenDecimalsInTypedSignRequest } from './useTokenDecimalsInTypedSignRequest';

jest.mock('./useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: () => ({
    details: {
      decimalsNumber: 2,
    },
  }),
}));

describe('useTokenDecimalsInTypedSignRequest', () => {
  it('returns correct decimal value for typed sign signature request', () => {
    const signatureRequest = typedSignV4SignatureRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedSignData = signatureRequest?.messageParams?.data as any;
    const { domain: { verifyingContract } = {}, sanitizedMessage } =
      parseSanitizeTypedDataMessage(typedSignData);

    const { result } = renderHook(() =>
      useTokenDecimalsInTypedSignRequest(
        typedSignV4SignatureRequest,
        sanitizedMessage?.value as unknown as DataTreeInput,
        verifyingContract,
      ),
    );
    expect(result.current).toStrictEqual(2);
  });
});
