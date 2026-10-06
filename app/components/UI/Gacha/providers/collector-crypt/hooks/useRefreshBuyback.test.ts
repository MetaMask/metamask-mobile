import { waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import {
  MOCK_ACCOUNT,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { getBuybackDisplay, useRefreshBuyback } from './useRefreshBuyback';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { GachaController: { refreshBuyback: jest.fn() } },
  },
}));

const controller = jest.mocked(Engine.context.GachaController);

describe('getBuybackDisplay', () => {
  it('returns the offer when available', () => {
    const display = getBuybackDisplay(
      { status: 'available', amount: '42000000' },
      { hasFailed: false },
    );

    expect(display).toStrictEqual({ status: 'available', amount: '42000000' });
  });

  it('returns unavailable when the card has no offer', () => {
    const display = getBuybackDisplay(
      { status: 'unavailable' },
      { hasFailed: false },
    );

    expect(display).toStrictEqual({ status: 'unavailable' });
  });

  it('returns an error when the refresh failed on an unknown offer', () => {
    const display = getBuybackDisplay(
      { status: 'unknown' },
      { hasFailed: true },
    );

    expect(display).toStrictEqual({ status: 'error' });
  });

  it('returns checking while the offer is unknown', () => {
    expect(getBuybackDisplay(undefined, { hasFailed: false })).toStrictEqual({
      status: 'checking',
    });
  });
});

describe('useRefreshBuyback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes the offer once per mint', async () => {
    controller.refreshBuyback.mockResolvedValue({ status: 'unavailable' });
    const { result, rerender } = renderHookWithQueryClient(() =>
      useRefreshBuyback({
        account: MOCK_ACCOUNT,
        mint: 'MintA',
        shouldRefresh: true,
      }),
    );

    rerender({});

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(controller.refreshBuyback).toHaveBeenCalledTimes(1);
    expect(controller.refreshBuyback).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      mint: 'MintA',
    });
    expect(result.current.hasFailed).toBe(false);
  });

  it('reports a failed refresh', async () => {
    controller.refreshBuyback.mockRejectedValue(new Error('offline'));

    const { result } = renderHookWithQueryClient(() =>
      useRefreshBuyback({
        account: MOCK_ACCOUNT,
        mint: 'MintA',
        shouldRefresh: true,
      }),
    );

    await waitFor(() => expect(result.current.hasFailed).toBe(true));
  });

  it('does not refresh when not requested', () => {
    renderHookWithQueryClient(() =>
      useRefreshBuyback({
        account: MOCK_ACCOUNT,
        mint: 'MintA',
        shouldRefresh: false,
      }),
    );

    expect(controller.refreshBuyback).not.toHaveBeenCalled();
  });
});
