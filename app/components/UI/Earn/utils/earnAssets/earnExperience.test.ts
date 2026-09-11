import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { EarnExperience } from '../../types/earnAssets';
import {
  getEarnInputExperiences,
  getNonMoneyEarnStrategyExperiences,
  getReadyEarnDepositExperiences,
} from './earnExperience';

const createExperience = (
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id: 'experience',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate: { type: 'APY', status: 'ready', percentage: 4.2 },
  isFeeSubsidized: false,
  ...overrides,
});

describe('earn experience utilities', () => {
  describe('getEarnInputExperiences', () => {
    it('excludes output experiences while preserving input order', () => {
      const firstInput = createExperience({ id: 'first' });
      const output = createExperience({ id: 'output', role: 'output' });
      const secondInput = createExperience({ id: 'second' });

      const result = getEarnInputExperiences([firstInput, output, secondInput]);

      expect(result).toEqual([firstInput, secondInput]);
    });

    it('returns an empty list for no experiences', () => {
      const result = getEarnInputExperiences([]);

      expect(result).toEqual([]);
    });
  });

  describe('getReadyEarnDepositExperiences', () => {
    it('returns ready input experiences', () => {
      const readyExperience = createExperience({ id: 'ready' });
      const notReadyExperience = createExperience({
        id: 'not-ready',
        depositReadiness: {
          status: 'not_ready',
          reason: 'insufficient_balance',
        },
      });
      const outputExperience = createExperience({
        id: 'output',
        role: 'output',
      });

      const result = getReadyEarnDepositExperiences([
        readyExperience,
        notReadyExperience,
        outputExperience,
      ]);

      expect(result).toEqual([readyExperience]);
    });

    it('returns no experiences when every input is not ready', () => {
      const result = getReadyEarnDepositExperiences([
        createExperience({
          depositReadiness: {
            status: 'not_ready',
            reason: 'asset_not_tracked',
          },
        }),
      ]);

      expect(result).toEqual([]);
    });
  });

  describe('getNonMoneyEarnStrategyExperiences', () => {
    it('retains non-Money funding inputs while excluding Money and output experiences', () => {
      const lendingExperience = createExperience({
        id: 'lending',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      });
      const fundingExperience = createExperience({
        id: 'funding',
        type: EARN_EXPERIENCES.POOLED_STAKING,
        role: 'funding',
      });
      const moneyExperience = createExperience({
        id: 'money',
        type: 'MONEY_ACCOUNT_DEPOSIT',
        role: 'funding',
      });
      const outputExperience = createExperience({
        id: 'output',
        type: EARN_EXPERIENCES.TRX_STAKING,
        role: 'output',
      });

      const result = getNonMoneyEarnStrategyExperiences([
        lendingExperience,
        fundingExperience,
        moneyExperience,
        outputExperience,
      ]);

      expect(result).toEqual([lendingExperience, fundingExperience]);
    });

    it('retains a not-ready non-Money input experience', () => {
      const notReadyExperience = createExperience({
        depositReadiness: {
          status: 'not_ready',
          reason: 'balance_unavailable',
        },
      });

      const result = getNonMoneyEarnStrategyExperiences([notReadyExperience]);

      expect(result).toEqual([notReadyExperience]);
    });

    it('excludes output experiences from non-Money strategies', () => {
      const outputExperience = createExperience({
        role: 'output',
      });

      const result = getNonMoneyEarnStrategyExperiences([outputExperience]);

      expect(result).toEqual([]);
    });
  });
});
