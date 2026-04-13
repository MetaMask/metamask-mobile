import { executeHardwareWalletOperation } from './executeHardwareWalletOperation';

const mockGetDeviceIdForAddress = jest.fn();
const mockGetHardwareWalletTypeForAddress = jest.fn();
const mockIsUserCancellation = jest.fn().mockReturnValue(false);

jest.mock('./helpers', () => ({
  getDeviceIdForAddress: (...args: unknown[]) =>
    mockGetDeviceIdForAddress(...args),
  getHardwareWalletTypeForAddress: (...args: unknown[]) =>
    mockGetHardwareWalletTypeForAddress(...args),
}));

jest.mock('./errors', () => ({
  isUserCancellation: (...args: unknown[]) => mockIsUserCancellation(...args),
}));

describe('executeHardwareWalletOperation', () => {
  const ensureDeviceReady = jest.fn();
  const showAwaitingConfirmation = jest.fn();
  const hideAwaitingConfirmation = jest.fn();
  const showHardwareWalletError = jest.fn();
  const setTargetWalletType = jest.fn();
  const execute = jest.fn();
  const onRejected = jest.fn();

  const baseOptions = {
    address: '0x123',
    operationType: 'transaction' as const,
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    execute,
    onRejected,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDeviceIdForAddress.mockResolvedValue('device-123');
    mockGetHardwareWalletTypeForAddress.mockReturnValue('ledger');
    ensureDeviceReady.mockResolvedValue(true);
    execute.mockResolvedValue(undefined);
  });

  it('resolves the device id before checking readiness', async () => {
    await expect(executeHardwareWalletOperation(baseOptions)).resolves.toBe(
      true,
    );

    expect(mockGetDeviceIdForAddress).toHaveBeenCalledWith('0x123');
    expect(ensureDeviceReady).toHaveBeenCalledWith('device-123');
  });

  it('sets and clears the target wallet type around the operation', async () => {
    await executeHardwareWalletOperation(baseOptions);

    expect(setTargetWalletType).toHaveBeenNthCalledWith(1, 'ledger');
    expect(setTargetWalletType).toHaveBeenLastCalledWith(null);
  });

  it('shows awaiting confirmation while executing the operation', async () => {
    await executeHardwareWalletOperation(baseOptions);

    expect(showAwaitingConfirmation).toHaveBeenCalledWith(
      'transaction',
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(hideAwaitingConfirmation).toHaveBeenCalledTimes(1);
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('rejects when the device is not ready', async () => {
    ensureDeviceReady.mockResolvedValue(false);

    await expect(executeHardwareWalletOperation(baseOptions)).resolves.toBe(
      false,
    );

    expect(showAwaitingConfirmation).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it('shows hardware wallet errors for non-user cancellations', async () => {
    const error = new Error('signing failed');
    execute.mockRejectedValueOnce(error);

    await expect(executeHardwareWalletOperation(baseOptions)).resolves.toBe(
      false,
    );

    expect(hideAwaitingConfirmation).toHaveBeenCalledTimes(1);
    expect(showHardwareWalletError).toHaveBeenCalledWith(error);
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it('does not show hardware wallet errors for user cancellations', async () => {
    const error = new Error('User rejected');
    execute.mockRejectedValueOnce(error);
    mockIsUserCancellation.mockReturnValueOnce(true);

    await expect(executeHardwareWalletOperation(baseOptions)).resolves.toBe(
      false,
    );

    expect(showHardwareWalletError).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it('rejects only once when the awaiting confirmation cancel callback fires after an error', async () => {
    let cancelCallback: (() => void) | undefined;
    showAwaitingConfirmation.mockImplementation(
      (_operationType: string, onReject?: () => void) => {
        cancelCallback = onReject;
      },
    );
    execute.mockRejectedValueOnce(new Error('fail'));

    await executeHardwareWalletOperation(baseOptions);
    cancelCallback?.();

    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it('does not set target wallet type when wallet type is null', async () => {
    mockGetHardwareWalletTypeForAddress.mockReturnValue(null);

    await executeHardwareWalletOperation(baseOptions);

    expect(setTargetWalletType).not.toHaveBeenCalled();
  });

  it('works without setTargetWalletType provided', async () => {
    const { setTargetWalletType: _, ...optionsWithoutSetter } = baseOptions;

    await expect(
      executeHardwareWalletOperation(optionsWithoutSetter),
    ).resolves.toBe(true);

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('works without onRejected provided', async () => {
    const { onRejected: _, ...optionsWithoutReject } = baseOptions;

    await expect(
      executeHardwareWalletOperation(optionsWithoutReject),
    ).resolves.toBe(true);
  });

  it('handles operationType message', async () => {
    await expect(
      executeHardwareWalletOperation({
        ...baseOptions,
        operationType: 'message',
      }),
    ).resolves.toBe(true);

    expect(showAwaitingConfirmation).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
  });

  it('skips hardware wallet error when cancel callback fires before execute throws', async () => {
    let cancelCallback: (() => void) | undefined;
    showAwaitingConfirmation.mockImplementation(
      (_operationType: string, onReject?: () => void) => {
        cancelCallback = onReject;
      },
    );
    execute.mockImplementation(async () => {
      cancelCallback?.();
      throw new Error('fail');
    });

    await expect(executeHardwareWalletOperation(baseOptions)).resolves.toBe(
      false,
    );

    expect(showHardwareWalletError).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it('handles errors during getDeviceIdForAddress', async () => {
    const error = new Error('device lookup failed');
    mockGetDeviceIdForAddress.mockRejectedValueOnce(error);

    await expect(executeHardwareWalletOperation(baseOptions)).resolves.toBe(
      false,
    );

    expect(showHardwareWalletError).toHaveBeenCalledWith(error);
    expect(execute).not.toHaveBeenCalled();
  });

  it('clears target wallet type in finally block even on error', async () => {
    execute.mockRejectedValueOnce(new Error('fail'));

    await executeHardwareWalletOperation(baseOptions);

    expect(setTargetWalletType).toHaveBeenNthCalledWith(1, 'ledger');
    expect(setTargetWalletType).toHaveBeenLastCalledWith(null);
  });
});
