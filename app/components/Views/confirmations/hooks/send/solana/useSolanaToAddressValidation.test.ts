import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useSolanaToAddressValidation } from './useSolanaToAddressValidation';

const mockState = {
  state: evmSendStateMock,
};

describe('useSolanaToAddressValidation', () => {
  it('return fields for in address error and warning', () => {
    const { result } = renderHookWithProvider(
      () => useSolanaToAddressValidation(),
      mockState as ProviderValues,
    );
    expect(result.current.validateSolanaToAddress).toBeDefined();
  });
});
