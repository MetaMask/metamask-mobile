import { createDepositNavigationDetails } from './utils';
import Routes from '../../../../../constants/navigation/Routes';

describe('createDepositNavigationDetails', () => {
  describe('without intent', () => {
    it('returns route without params when intent is undefined', () => {
      const result = createDepositNavigationDetails(undefined);

      expect(result).toEqual([Routes.DEPOSIT.ID]);
    });

    it('returns route without params when no intent is provided', () => {
      const result = createDepositNavigationDetails();

      expect(result).toEqual([Routes.DEPOSIT.ID]);
    });
  });

  describe('with intent', () => {
    it('returns nested navigation structure when intent with assetId is provided', () => {
      const intent = { assetId: 'eth' };

      const result = createDepositNavigationDetails(intent);

      expect(result).toEqual([
        Routes.DEPOSIT.ID,
        {
          screen: Routes.DEPOSIT.ROOT,
          params: intent,
        },
      ]);
    });

    it('returns nested navigation structure when intent with amount is provided', () => {
      const intent = { amount: '100' };

      const result = createDepositNavigationDetails(intent);

      expect(result).toEqual([
        Routes.DEPOSIT.ID,
        {
          screen: Routes.DEPOSIT.ROOT,
          params: intent,
        },
      ]);
    });

    it('returns nested navigation structure when intent with both assetId and amount is provided', () => {
      const intent = { assetId: 'eth', amount: '100' };

      const result = createDepositNavigationDetails(intent);

      expect(result).toEqual([
        Routes.DEPOSIT.ID,
        {
          screen: Routes.DEPOSIT.ROOT,
          params: intent,
        },
      ]);
    });

    it('returns nested navigation structure when intent with chainId format assetId is provided', () => {
      const intent = { assetId: 'eip155:1/0x123' };

      const result = createDepositNavigationDetails(intent);

      expect(result).toEqual([
        Routes.DEPOSIT.ID,
        {
          screen: Routes.DEPOSIT.ROOT,
          params: intent,
        },
      ]);
    });
  });
});
