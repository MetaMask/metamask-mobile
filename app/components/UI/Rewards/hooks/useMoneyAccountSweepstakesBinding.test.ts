import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneyAccountSweepstakesBinding } from './useMoneyAccountSweepstakesBinding';

const mockCall = jest.fn();
let mockSubscriptionId: string | null = 'sub-1';
let mockPrimaryMoneyAccount: { address: string } | undefined = {
  address: '0xABCDEF1234567890abcdef1234567890ABCDEF12',
};

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: () => mockSubscriptionId,
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: () => mockPrimaryMoneyAccount,
}));

describe('useMoneyAccountSweepstakesBinding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionId = 'sub-1';
    mockPrimaryMoneyAccount = {
      address: '0xABCDEF1234567890abcdef1234567890ABCDEF12',
    };
    mockCall.mockResolvedValue('bound');
  });

  it('returns unavailable when there is no subscription', async () => {
    mockSubscriptionId = null;

    const { result } = renderHook(() => useMoneyAccountSweepstakesBinding());

    let bindingResult: string | undefined;
    await act(async () => {
      bindingResult = await result.current.ensureBound();
    });

    expect(bindingResult).toBe('unavailable');
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.bindingConflict).toBe(false);
  });

  it('returns unavailable when there is no money account address', async () => {
    mockPrimaryMoneyAccount = undefined;

    const { result } = renderHook(() => useMoneyAccountSweepstakesBinding());

    let bindingResult: string | undefined;
    await act(async () => {
      bindingResult = await result.current.ensureBound();
    });

    expect(bindingResult).toBe('unavailable');
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns bound and clears conflict state on success', async () => {
    const { result } = renderHook(() => useMoneyAccountSweepstakesBinding());

    let bindingResult: string | undefined;
    await act(async () => {
      bindingResult = await result.current.ensureBound();
    });

    expect(bindingResult).toBe('bound');
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:registerMoneyAccountBinding',
      mockPrimaryMoneyAccount?.address,
      'sub-1',
    );
    expect(result.current.bindingConflict).toBe(false);
  });

  it('returns conflict and sets bindingConflict', async () => {
    mockCall.mockResolvedValue('conflict');

    const { result } = renderHook(() => useMoneyAccountSweepstakesBinding());

    let bindingResult: string | undefined;
    await act(async () => {
      bindingResult = await result.current.ensureBound();
    });

    expect(bindingResult).toBe('conflict');
    expect(result.current.bindingConflict).toBe(true);
  });

  it('returns unavailable when the controller call throws', async () => {
    mockCall.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useMoneyAccountSweepstakesBinding());

    let bindingResult: string | undefined;
    await act(async () => {
      bindingResult = await result.current.ensureBound();
    });

    expect(bindingResult).toBe('unavailable');
    expect(result.current.bindingConflict).toBe(false);
  });
});
