import { captureException } from '@sentry/react-native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockCaptureException = captureException as jest.MockedFunction<
  typeof captureException
>;

describe('reportRewardsMoneyReadFailure', () => {
  beforeEach(() => {
    mockCaptureException.mockClear();
  });

  it('stays quiet for a short busy read that still has a refetch ahead', () => {
    reportRewardsMoneyReadFailure(
      new RewardsMoneyHttpError('busy', 503, undefined, 2),
      'earningsSummary.fetch_failed',
      false,
      'rewards-money',
    );
    reportRewardsMoneyReadFailure(
      new RewardsMoneyHttpError('limited', 429, undefined, 5),
      'earningsSummary.fetch_failed',
      false,
      'rewards-money',
    );
    reportRewardsMoneyReadFailure(
      new RewardsMoneyHttpError('busy', 503, undefined, 30),
      'earningsSummary.fetch_failed',
      false,
      'rewards-money',
    );

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('reports a short busy read once the refetch has failed', () => {
    const busy = new RewardsMoneyHttpError('busy', 429, undefined, 2);

    reportRewardsMoneyReadFailure(
      busy,
      'referralMe.fetch_failed',
      false,
      'rewards-money',
    );
    reportRewardsMoneyReadFailure(
      busy,
      'referralMe.fetch_failed',
      true,
      'rewards-money',
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(busy, {
      tags: {
        feature: 'rewards-money',
        context: 'referralMe.fetch_failed',
      },
    });
  });

  it('reports a busy read over 30 seconds immediately', () => {
    const busy = new RewardsMoneyHttpError('busy', 503, undefined, 31);

    reportRewardsMoneyReadFailure(
      busy,
      'cursorPaginatedList.fetch_failed',
      false,
      'rewards',
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(busy, {
      tags: {
        feature: 'rewards',
        context: 'cursorPaginatedList.fetch_failed',
      },
    });
  });

  it('stays quiet when the controller reports Rewards Money is disabled', () => {
    const disabled = new Error('Rewards Money is disabled');

    reportRewardsMoneyReadFailure(
      disabled,
      'earningsSummary.fetch_failed',
      false,
      'rewards-money',
    );
    reportRewardsMoneyReadFailure(
      disabled,
      'referralMe.fetch_failed',
      true,
      'rewards-money',
    );

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('reports any other failure immediately, and only once when screens share it', () => {
    const failure = new Error('network');

    reportRewardsMoneyReadFailure(
      failure,
      'earningsSummary.fetch_failed',
      false,
      'rewards-money',
    );
    reportRewardsMoneyReadFailure(
      failure,
      'earningsSummary.fetch_failed',
      false,
      'rewards-money',
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(failure, {
      tags: {
        feature: 'rewards-money',
        context: 'earningsSummary.fetch_failed',
      },
    });
  });
});
