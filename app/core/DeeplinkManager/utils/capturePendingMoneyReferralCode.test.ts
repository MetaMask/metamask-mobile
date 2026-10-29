import ReduxService from '../../redux';
import { setPendingReferralCode } from '../../../reducers/rewardsMoney';
import { capturePendingMoneyReferralCode } from './capturePendingMoneyReferralCode';

jest.mock('../../redux', () => ({
  __esModule: true,
  default: { store: { dispatch: jest.fn() } },
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const mockDispatch = ReduxService.store.dispatch as jest.Mock;

describe('capturePendingMoneyReferralCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the normalized code from the ref parameter', () => {
    const url = new URL('https://link.metamask.io/rewards?ref=kol-123');

    capturePendingMoneyReferralCode(url);

    expect(mockDispatch).toHaveBeenCalledWith(setPendingReferralCode('KOL123'));
  });

  it('leaves the store alone when the link has no ref parameter', () => {
    const url = new URL('https://link.metamask.io/rewards');

    capturePendingMoneyReferralCode(url);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('discards a malformed code', () => {
    const url = new URL('https://link.metamask.io/rewards?ref=a');

    capturePendingMoneyReferralCode(url);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not throw when the store is unavailable', () => {
    mockDispatch.mockImplementationOnce(() => {
      throw new Error('store not ready');
    });
    const url = new URL('https://link.metamask.io/rewards?ref=KOL1');

    expect(() => capturePendingMoneyReferralCode(url)).not.toThrow();
  });
});
