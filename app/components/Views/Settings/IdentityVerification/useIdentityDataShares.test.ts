import { renderHook, waitFor } from '@testing-library/react-native';
import type { KycDataShare } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useIdentityDataShares } from './useIdentityDataShares';

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      getDataShares: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGetDataShares = jest.mocked(
  Engine.context.KycController.getDataShares,
);

const MOONPAY_SHARE: KycDataShare = {
  kycSessionId: '123e4567-e89b-12d3-a456-426614174000',
  vendor: 'moonpay',
  sharedAt: '2026-09-17T11:23:00.000Z',
};

describe('useIdentityDataShares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the shares the controller resolves', async () => {
    mockGetDataShares.mockResolvedValue([MOONPAY_SHARE]);

    const { result } = renderHook(() => useIdentityDataShares());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shares).toEqual([MOONPAY_SHARE]);
  });

  it('starts in a loading state before the fetch settles', () => {
    mockGetDataShares.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useIdentityDataShares());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.shares).toEqual([]);
  });

  it('returns an empty list and logs when the controller rejects', async () => {
    const error = new Error('relay unavailable');
    mockGetDataShares.mockRejectedValue(error);

    const { result } = renderHook(() => useIdentityDataShares());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shares).toEqual([]);
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'IdentityVerification: failed to load identity data shares',
    );
  });

  it('does not set state after unmount', async () => {
    let resolveShares: (shares: KycDataShare[]) => void = () => undefined;
    mockGetDataShares.mockReturnValue(
      new Promise((resolve) => {
        resolveShares = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useIdentityDataShares());
    unmount();
    resolveShares([MOONPAY_SHARE]);

    await waitFor(() => expect(mockGetDataShares).toHaveBeenCalledTimes(1));
    expect(result.current.shares).toEqual([]);
  });
});
