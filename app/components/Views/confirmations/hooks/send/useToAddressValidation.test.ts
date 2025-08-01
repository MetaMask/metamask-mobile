import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useToAddressValidation } from './useToAddressValidation';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC721AssetSymbol: Promise.resolve(undefined),
    },
  },
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useToAddressValidation', () => {
  it('return fields for in address error and warning', () => {
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState as ProviderValues,
    );
    expect(result.current).toStrictEqual({
      toAddressError: undefined,
      toAddressWarning: undefined,
    });
  });
});
