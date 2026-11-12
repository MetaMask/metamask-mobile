import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { BAANX_MAX_LIMIT } from '../constants';
import { CardEntryPoint } from '../util/metrics';
import { setImmersveFundingSettling } from '../../../../core/redux/slices/card';
import { useMoneyAccountCardLinkage } from './useMoneyAccountCardLinkage';
import { useImmersveMoneyAccountFundingApproval } from './useImmersveMoneyAccountFundingApproval';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

const mockConfirmLinkInBackground = jest.fn();
jest.mock('./useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: jest.fn(),
}));

const mockDispatch = jest.fn();

describe('useImmersveMoneyAccountFundingApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockReturnValue(false);
    (useMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
      confirmLinkInBackground: mockConfirmLinkInBackground,
    });
    mockConfirmLinkInBackground.mockResolvedValue(true);
  });

  it('submits the allowance and marks funding as settling on success', async () => {
    const { result } = renderHook(() =>
      useImmersveMoneyAccountFundingApproval(),
    );

    let linked = false;
    await act(async () => {
      linked = await result.current.approveFunding(CardEntryPoint.SIGN_UP);
    });

    expect(linked).toBe(true);
    expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
      delegationAmountHuman: BAANX_MAX_LIMIT,
      entrypoint: CardEntryPoint.SIGN_UP,
      showSuccessToast: false,
    });
    expect(mockDispatch).toHaveBeenCalledWith(setImmersveFundingSettling(true));
  });

  it('does not mark funding as settling when the approval does not complete', async () => {
    mockConfirmLinkInBackground.mockResolvedValue(false);
    const { result } = renderHook(() =>
      useImmersveMoneyAccountFundingApproval(),
    );

    await act(async () => {
      await result.current.approveFunding(
        CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
      );
    });

    expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
      delegationAmountHuman: BAANX_MAX_LIMIT,
      entrypoint: CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
      showSuccessToast: false,
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('forwards a toast hold and still skips the success toast', async () => {
    const { result } = renderHook(() =>
      useImmersveMoneyAccountFundingApproval(),
    );
    const holdToastsUntil = Promise.resolve();

    await act(async () => {
      await result.current.approveFunding(CardEntryPoint.SIGN_UP, {
        holdToastsUntil,
      });
    });

    expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
      delegationAmountHuman: BAANX_MAX_LIMIT,
      entrypoint: CardEntryPoint.SIGN_UP,
      showSuccessToast: false,
      holdToastsUntil,
    });
  });

  it('reports the controller link as in progress', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() =>
      useImmersveMoneyAccountFundingApproval(),
    );

    expect(result.current.isApproving).toBe(true);
  });
});
