import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useToAddressValidation } from './useToAddressValidation';

const mockState = {
  state: evmSendStateMock,
};

describe('useToAddressValidation', () => {
  it('return fields for to address error and warning', () => {
    const { result } = renderHookWithProvider(
      () =>
        useToAddressValidation('0x1234567890123456789012345678901234567890'),
      mockState,
    );
    expect(result.current).toStrictEqual({
      toAddressError: undefined,
      toAddressWarning: undefined,
    });
  });
});
