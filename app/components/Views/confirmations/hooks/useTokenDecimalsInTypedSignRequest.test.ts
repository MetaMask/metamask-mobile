import { renderHook } from '@testing-library/react-hooks';

import { typedSignV4SignatureRequest } from '../../../../util/test/confirm-data-helpers';
import { DataTreeInput } from '../components/Confirm/DataTree/DataTree';
import { parseAndSanitizeSignTypedData } from '../utils/signature';
// eslint-disable-next-line import/no-namespace
import * as TokenDecimalHook from './useGetTokenStandardAndDetails';
import { useTokenDecimalsInTypedSignRequest } from './useTokenDecimalsInTypedSignRequest';

describe('useTokenDecimalsInTypedSignRequest', () => {
  const signatureRequest = typedSignV4SignatureRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSignData = signatureRequest?.messageParams?.data as any;
  const { domain: { verifyingContract } = {}, sanitizedMessage } =
    parseAndSanitizeSignTypedData(typedSignData);

  it('returns correct decimal value for typed sign signature request', () => {
    jest
      .spyOn(TokenDecimalHook, 'useGetTokenStandardAndDetails')
      .mockReturnValue({
        details: {
          decimalsNumber: 2,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    const { result } = renderHook(() =>
      useTokenDecimalsInTypedSignRequest(
        typedSignV4SignatureRequest,
        sanitizedMessage?.value as unknown as DataTreeInput,
        verifyingContract,
      ),
    );
    expect(result.current).toStrictEqual(2);
  });

  it('returns undefined if no data is found for the token', () => {
    jest
      .spyOn(TokenDecimalHook, 'useGetTokenStandardAndDetails')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({} as any);
    const { result } = renderHook(() =>
      useTokenDecimalsInTypedSignRequest(
        typedSignV4SignatureRequest,
        sanitizedMessage?.value as unknown as DataTreeInput,
        verifyingContract,
      ),
    );
    expect(result.current).toStrictEqual(undefined);
  });
});
