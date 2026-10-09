import { act, renderHook } from '@testing-library/react-native';
import { validateAddressOrENS } from '../../../../../util/address';
import {
  useContactValidation,
  type ValidationResult,
} from './useContactValidation';

jest.mock('../../../../../util/address', () => ({
  validateAddressOrENS: jest.fn(),
}));

const validateAddressOrENSMock = jest.mocked(validateAddressOrENS);
const validationResult = (address: string): ValidationResult => ({
  addressError: null,
  addressReady: true,
  addToAddressToAddressBook: true,
  confusableCollection: null,
  errorContinue: false,
  toAddressName: null,
  toEnsAddress: address,
  toEnsName: undefined,
});

describe('useContactValidation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    validateAddressOrENSMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates with the latest address book, accounts, and chain', async () => {
    const onResult = jest.fn();
    const initialProps: Parameters<typeof useContactValidation>[0] = {
      addressBook: {},
      chainId: '0x1',
      contactChainId: '',
      internalAccounts: [],
      onResult,
    };
    const updatedAddressBook = { '0x2': {} };
    validateAddressOrENSMock.mockResolvedValue(
      validationResult('0x0000000000000000000000000000000000000002'),
    );
    const { result, rerender } = renderHook(
      (props) => useContactValidation(props),
      { initialProps },
    );

    rerender({
      ...initialProps,
      addressBook: updatedAddressBook,
      chainId: '0x2',
    });
    result.current('0x0000000000000000000000000000000000000002');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(validateAddressOrENSMock).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000000002',
      updatedAddressBook,
      initialProps.internalAccounts,
      '0x2',
    );
  });

  it('ignores an older validation that resolves after the latest request', async () => {
    const onResult = jest.fn();
    let resolveFirst: (result: ValidationResult) => void = () => undefined;
    let resolveSecond: (result: ValidationResult) => void = () => undefined;
    validateAddressOrENSMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const { result } = renderHook(() =>
      useContactValidation({
        addressBook: {},
        chainId: '0x1',
        contactChainId: '',
        internalAccounts: [],
        onResult,
      }),
    );
    const firstAddress = '0x0000000000000000000000000000000000000001';
    const secondAddress = '0x0000000000000000000000000000000000000002';

    result.current(firstAddress);
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    result.current(secondAddress);
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      resolveSecond(validationResult(secondAddress));
    });
    await act(async () => {
      resolveFirst(validationResult(firstAddress));
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(
      validationResult(secondAddress),
      secondAddress,
    );
  });
});
