import { useParams } from '../../../../../util/navigation/navUtils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { useTransactionDetails } from './useTransactionDetails';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

function runHook() {
  return renderHookWithProvider(useTransactionDetails, {
    state: simpleSendTransactionControllerMock,
  });
}

describe('useTransactionDetails', () => {
  const useParamsMock = jest.mocked(useParams);

  beforeEach(() => {
    jest.resetAllMocks();

    useParamsMock.mockReturnValue({
      transactionId: transactionIdMock,
    });
  });

  it('returns transaction meta', () => {
    const { result } = runHook();

    expect(result.current.transactionMeta).toStrictEqual(
      expect.objectContaining({
        id: transactionIdMock,
      }),
    );
  });

  it('returns no transaction meta if id not found', () => {
    useParamsMock.mockReturnValue({
      transactionId: 'non-existent-id',
    });

    const { result } = runHook();

    expect(result.current.transactionMeta).toBeUndefined();
  });
});
