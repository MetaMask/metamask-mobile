import { renderUnstakingTimeRemaining } from '.';

describe('Unstake Banner Utils', () => {
  describe('Renders the unstaking time remaining', () => {
    const MOCK_ETH_AMOUNT = '0.0012';

    it('returns default text when days and hours = 0', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 0, hours: 0, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in a few days to claim it.`,
      );
    });

    it('returns "day" only when days = 1 and hours = 0', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 1, hours: 0, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in 1 day to claim it.`,
      );
    });

    it('returns "days" only when days > 1 and hours = 0', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 2, hours: 0, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in 2 days to claim it.`,
      );
    });

    it('returns "hour" only when days = 0 and hours = 1', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 0, hours: 1, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in 1 hour to claim it.`,
      );
    });

    it('returns "hours" only when days = 0 and hours > 1', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 0, hours: 2, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in 2 hours to claim it.`,
      );
    });

    it('returns "day" and "hour" text when days and hours = 1', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 1, hours: 1, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in 1 day and 1 hour to claim it.`,
      );
    });

    it('returns "days" and "hours" text when days and hours > 1', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 5, hours: 2, minutes: 0 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in 5 days and 2 hours to claim it.`,
      );
    });

    it('returns "minutes" if days and hours = 0', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 0, hours: 0, minutes: 35 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in approximately 35 minutes to claim it.`,
      );
    });

    it('return "minute" if days and hours = 0 and minutes = 1', () => {
      const result = renderUnstakingTimeRemaining(
        { days: 0, hours: 0, minutes: 1 },
        MOCK_ETH_AMOUNT,
      );

      expect(result).toBe(
        `Unstaking ${MOCK_ETH_AMOUNT} ETH in progress. Come back in approximately 1 minute to claim it.`,
      );
    });
  });
});
