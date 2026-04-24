import { handleSocialTraderPositionUrl } from '../handleSocialTraderPositionUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(),
  }),
);

describe('handleSocialTraderPositionUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectSocialLeaderboardEnabled).mockReturnValue(true);
  });

  describe('feature flag disabled', () => {
    beforeEach(() => {
      jest.mocked(selectSocialLeaderboardEnabled).mockReturnValue(false);
    });

    it('navigates to WALLET.HOME', () => {
      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('does not navigate to social leaderboard screens', () => {
      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.POSITION,
        expect.anything(),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.PROFILE,
        expect.anything(),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.VIEW,
      );
    });
  });

  describe('all required params present', () => {
    it('navigates to POSITION with constructed position object', () => {
      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc123&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.POSITION,
        {
          traderId: 'trader1',
          traderName: '',
          tokenSymbol: 'ETH',
          position: {
            tokenAddress: '0xabc123',
            chain: '1',
            tokenSymbol: 'ETH',
            tokenName: 'ETH',
            positionAmount: 0,
            boughtUsd: 0,
            soldUsd: 0,
            realizedPnl: 0,
            costBasis: 0,
            trades: [],
            lastTradeAt: 0,
          },
        },
      );
    });

    it('includes traderName when provided', () => {
      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc123&chain=1&tokenSymbol=ETH&traderName=Alice',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.POSITION,
        expect.objectContaining({ traderName: 'Alice' }),
      );
    });

    it('defaults traderName to empty string when not provided', () => {
      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc123&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.POSITION,
        expect.objectContaining({ traderName: '' }),
      );
    });

    it('does not forward positionContext to navigation params', () => {
      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc123&chain=1&tokenSymbol=ETH&positionContext=open',
      });

      const navParams = mockNavigate.mock.calls[0][1];
      expect(navParams).not.toHaveProperty('positionContext');
      expect(navParams.position).not.toHaveProperty('positionContext');
    });
  });

  describe('traderId present but position params incomplete', () => {
    it('navigates to PROFILE when tokenAddress is missing', () => {
      handleSocialTraderPositionUrl({
        actionPath: '?traderId=trader1&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.PROFILE,
        { traderId: 'trader1', traderName: '' },
      );
    });

    it('navigates to PROFILE when chain is missing', () => {
      handleSocialTraderPositionUrl({
        actionPath: '?traderId=trader1&tokenAddress=0xabc&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.PROFILE,
        { traderId: 'trader1', traderName: '' },
      );
    });

    it('navigates to PROFILE when tokenSymbol is missing', () => {
      handleSocialTraderPositionUrl({
        actionPath: '?traderId=trader1&tokenAddress=0xabc&chain=1',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.PROFILE,
        { traderId: 'trader1', traderName: '' },
      );
    });

    it('includes traderName in profile navigation when provided', () => {
      handleSocialTraderPositionUrl({
        actionPath: '?traderId=trader1&traderName=Bob',
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.PROFILE,
        { traderId: 'trader1', traderName: 'Bob' },
      );
    });
  });

  describe('traderId missing', () => {
    it('navigates to SOCIAL_LEADERBOARD.VIEW', () => {
      handleSocialTraderPositionUrl({
        actionPath: '?tokenAddress=0xabc&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
    });

    it('navigates to VIEW with empty actionPath', () => {
      handleSocialTraderPositionUrl({ actionPath: '' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
    });
  });

  describe('error handling', () => {
    it('falls back to WALLET.HOME when navigation throws', () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc&chain=1&tokenSymbol=ETH',
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
    });

    it('logs error when navigation throws', () => {
      const error = new Error('Navigation error');
      mockNavigate.mockImplementationOnce(() => {
        throw error;
      });

      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc&chain=1&tokenSymbol=ETH',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
        error,
      );
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        '[handleSocialTraderPositionUrl] Error handling social-trader-position deeplink',
      );
    });

    it('logs second error when fallback navigation also throws', () => {
      const primaryError = new Error('Primary navigation error');
      const fallbackError = new Error('Fallback navigation error');
      mockNavigate
        .mockImplementationOnce(() => {
          throw primaryError;
        })
        .mockImplementationOnce(() => {
          throw fallbackError;
        });

      handleSocialTraderPositionUrl({
        actionPath:
          '?traderId=trader1&tokenAddress=0xabc&chain=1&tokenSymbol=ETH',
      });

      expect(Logger.error).toHaveBeenCalledWith(
        primaryError,
        '[handleSocialTraderPositionUrl] Error handling social-trader-position deeplink',
      );
      expect(Logger.error).toHaveBeenCalledWith(
        fallbackError,
        '[handleSocialTraderPositionUrl] Failed to navigate to fallback screen',
      );
    });
  });
});
