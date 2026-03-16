import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { EARN_EXPERIENCES } from '../constants/experiences';
import type { EarnTokenDetails } from '../types/lending.types';
import type { TokenI } from '../../Tokens/types';
import type { TronResourcesMap } from '../../../../selectors/assets/assets-list';
import {
  buildTronEarnTokenIfEligible,
  getLocalizedErrorMessage,
  getStakedTrxTotalFromResources,
  handleTronStakingNavigationResult,
  hasStakedTrxPositions,
} from './tron';

jest.mock('../../../../constants/navigation/Routes', () => ({
  MODAL: {
    ROOT_MODAL_FLOW: 'RootModalFlow',
  },
  SHEET: {
    SUCCESS_ERROR_SHEET: 'SuccessErrorSheet',
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUpdateBalance = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainBalancesController: {
      updateBalance: (accountId: string) => mockUpdateBalance(accountId),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('tron utils', () => {
  interface RafGlobal {
    requestAnimationFrame?: (callback: () => void) => void;
  }

  const globalWithRaf = global as unknown as RafGlobal;

  beforeAll(() => {
    globalWithRaf.requestAnimationFrame = (callback: () => void) => {
      callback();
    };
  });

  describe('getStakedTrxTotalFromResources', () => {
    it('returns zero when resources are missing', () => {
      const total = getStakedTrxTotalFromResources(undefined);

      expect(total).toBe(0);
    });

    it('returns zero when resources are null', () => {
      const total = getStakedTrxTotalFromResources(null);

      expect(total).toBe(0);
    });

    it('returns totalStakedTrx from resources', () => {
      // totalStakedTrx is now pre-computed in the selector
      const resources: TronResourcesMap = {
        energy: undefined,
        bandwidth: undefined,
        maxEnergy: undefined,
        maxBandwidth: undefined,
        stakedTrxForEnergy: undefined,
        stakedTrxForBandwidth: undefined,
        totalStakedTrx: 15,
      };

      const total = getStakedTrxTotalFromResources(resources);

      expect(total).toBe(15);
    });

    it('defaults to zero when totalStakedTrx is undefined at runtime', () => {
      // Simulates a malformed object where totalStakedTrx is missing,
      // exercising the ?? 0 fallback in getStakedTrxTotalFromResources
      const resources = {
        energy: undefined,
        bandwidth: undefined,
        maxEnergy: undefined,
        maxBandwidth: undefined,
        stakedTrxForEnergy: undefined,
        stakedTrxForBandwidth: undefined,
      } as unknown as TronResourcesMap;

      const total = getStakedTrxTotalFromResources(resources);

      expect(total).toBe(0);
    });
  });

  describe('hasStakedTrxPositions', () => {
    it('returns false when totalStakedTrx is zero', () => {
      const resources: TronResourcesMap = {
        energy: undefined,
        bandwidth: undefined,
        maxEnergy: undefined,
        maxBandwidth: undefined,
        stakedTrxForEnergy: undefined,
        stakedTrxForBandwidth: undefined,
        totalStakedTrx: 0,
      };

      const result = hasStakedTrxPositions(resources);

      expect(result).toBe(false);
    });

    it('returns true when totalStakedTrx is greater than zero', () => {
      const resources: TronResourcesMap = {
        energy: undefined,
        bandwidth: undefined,
        maxEnergy: undefined,
        maxBandwidth: undefined,
        stakedTrxForEnergy: undefined,
        stakedTrxForBandwidth: undefined,
        totalStakedTrx: 1,
      };

      const result = hasStakedTrxPositions(resources);

      expect(result).toBe(true);
    });
  });

  describe('buildTronEarnTokenIfEligible', () => {
    const baseToken = {
      address: 'TYLL64qLaANnp5K6oxLpjWT9C3R5CHxgKE',
      aggregators: [],
      decimals: 6,
      image: '',
      name: 'TRON',
      symbol: 'TRX',
      balance: '123.45',
      balanceFiat: '10.00',
      logo: undefined,
      isETH: false,
    } as TokenI;

    it('returns undefined when staking is disabled', () => {
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: false,
        isTronEligible: true,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when token is not Tron eligible', () => {
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: false,
      });

      expect(result).toBeUndefined();
    });

    it('returns pooled staking earn token when staking is enabled and token is eligible', () => {
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
      }) as EarnTokenDetails;

      expect(result.isETH).toBe(false);
      expect(result.balanceFormatted).toBe(baseToken.balance);
      expect(result.balanceFiat).toBe(baseToken.balanceFiat);
      expect(result.tokenUsdExchangeRate).toBe(0);
      expect(result.experiences).toEqual([
        { type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' },
      ]);
      expect(result.experience).toEqual({
        type: EARN_EXPERIENCES.POOLED_STAKING,
        apr: '0',
      });
      expect(result.balanceMinimalUnit).toBeDefined();
    });

    it('uses stakedBalanceOverride when provided', () => {
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
        stakedBalanceOverride: 24,
      }) as EarnTokenDetails;

      expect(result.balanceFormatted).toBe('24');
      // 24 TRX with 6 decimals = 24 * 10^6
      expect(result.balanceMinimalUnit).toBe('24000000');
    });

    it('truncates floating-point precision errors in stakedBalanceOverride', () => {
      // This test verifies the BigNumber truncation fix:
      // A value like 130.96926000000002 should be truncated to 130.96926
      // before converting to minimal units
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
        stakedBalanceOverride: 130.96926000000002,
      }) as EarnTokenDetails;

      expect(result.balanceFormatted).toBe('130.96926000000002');
      // 130.96926 TRX with 6 decimals = 130969260
      // The truncation ensures this doesn't throw "too many decimal places"
      expect(result.balanceMinimalUnit).toBe('130969260');
    });

    it('truncates floating-point artifacts from 130.96926000000002 to valid minimal units', () => {
      // This is the exact error case from the bug report:
      // "Error: [number] while converting number 130.96926000000002 to token minimal util, too many decimal places"
      // This value was produced by floating-point addition and has 14 decimal places,
      // but TRX only has 6 decimals. Without the fix, toTokenMinimalUnit would throw.
      const problematicValue = 130.96926000000002;

      // Verify this would have too many decimals without truncation
      expect(problematicValue.toString().split('.')[1]?.length).toBeGreaterThan(
        6,
      );

      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
        stakedBalanceOverride: problematicValue,
      }) as EarnTokenDetails;

      // Should not throw and should produce correct minimal unit
      expect(result.balanceMinimalUnit).toBe('130969260');
    });

    it('truncates string balance override to token decimals', () => {
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
        stakedBalanceOverride: '50.12345678901234',
      }) as EarnTokenDetails;

      // Should truncate to 6 decimals (TRX decimals)
      // 50.123456 * 10^6 = 50123456
      expect(result.balanceMinimalUnit).toBe('50123456');
    });

    it('defaults to zero when stakedBalanceOverride is empty string', () => {
      // When stakedBalanceOverride is an empty string, normalizeToDotDecimal('')
      // returns an empty string. new BigNumber('') creates BigNumber(NaN),
      // and BigNumber(NaN).toFixed() returns 'NaN'. This would cause
      // toTokenMinimalUnit to throw. The fix defaults to '0' in this case.
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
        stakedBalanceOverride: '',
      }) as EarnTokenDetails;

      expect(result.balanceMinimalUnit).toBe('0');
    });

    it('defaults to zero when stakedBalanceOverride is non-numeric string', () => {
      // When stakedBalanceOverride is 'abc', normalizeToDotDecimal('abc')
      // strips non-digit characters and returns ''. This is the same as
      // the empty string case and should default to '0'.
      const result = buildTronEarnTokenIfEligible(baseToken, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
        stakedBalanceOverride: 'abc',
      }) as EarnTokenDetails;

      expect(result.balanceMinimalUnit).toBe('0');
    });

    it('defaults to zero when token balance is empty string', () => {
      const tokenWithEmptyBalance = {
        ...baseToken,
        balance: '',
      };

      const result = buildTronEarnTokenIfEligible(tokenWithEmptyBalance, {
        isTrxStakingEnabled: true,
        isTronEligible: true,
      }) as EarnTokenDetails;

      expect(result.balanceMinimalUnit).toBe('0');
    });
  });

  describe('getLocalizedErrorMessage', () => {
    it('returns empty string when errors is undefined', () => {
      const result = getLocalizedErrorMessage(undefined);

      expect(result).toBe('');
    });

    it('returns empty string when errors array is empty', () => {
      const result = getLocalizedErrorMessage([]);

      expect(result).toBe('');
    });

    it('returns localized message for InsufficientBalance error', () => {
      const result = getLocalizedErrorMessage(['InsufficientBalance']);

      expect(result).toBe('stake.tron.errors.insufficient_balance');
    });

    it('returns raw error message for unknown error codes', () => {
      const result = getLocalizedErrorMessage(['UnknownError']);

      expect(result).toBe('UnknownError');
    });

    it('returns mixed messages when errors contain both known and unknown codes', () => {
      const result = getLocalizedErrorMessage([
        'InsufficientBalance',
        'SomeOtherError',
      ]);

      expect(result).toBe(
        'stake.tron.errors.insufficient_balance\nSomeOtherError',
      );
    });
  });

  describe('handleTronStakingNavigationResult', () => {
    const createNavigation = (): NavigationProp<ParamListBase> =>
      ({
        goBack: jest.fn(),
        navigate: jest.fn(),
      }) as unknown as NavigationProp<ParamListBase>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockUpdateBalance.mockClear();
    });

    it('navigates to success sheet for stake when result is valid and has no errors', () => {
      const navigation = createNavigation();
      const result = {
        valid: true,
        errors: undefined,
      };

      handleTronStakingNavigationResult(navigation, result, 'stake');

      expect(navigation.goBack).toHaveBeenCalledTimes(1);
      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: {
            title: 'stake.tron.stake_completed',
            description: 'stake.tron.stake_completed_description',
            type: 'success',
            closeOnPrimaryButtonPress: true,
          },
        },
      );
    });

    it('refreshes multichain balance when accountId is provided on success', () => {
      const navigation = createNavigation();
      const result = {
        valid: true,
        errors: undefined,
      };
      const accountId = 'test-tron-account-id';

      handleTronStakingNavigationResult(navigation, result, 'stake', accountId);

      expect(mockUpdateBalance).toHaveBeenCalledWith(accountId);
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('does not refresh balance when accountId is not provided', () => {
      const navigation = createNavigation();
      const result = {
        valid: true,
        errors: undefined,
      };

      handleTronStakingNavigationResult(navigation, result, 'stake');

      expect(mockUpdateBalance).not.toHaveBeenCalled();
    });

    it('navigates to error sheet for stake when result has errors', () => {
      const navigation = createNavigation();
      const result = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
      };

      handleTronStakingNavigationResult(navigation, result, 'stake');

      expect(navigation.goBack).not.toHaveBeenCalled();
      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: {
            title: 'stake.tron.stake_failed',
            description: 'Error 1\nError 2',
            type: 'error',
          },
        },
      );
    });

    it('navigates to success sheet for unstake when result is valid and has no errors', () => {
      const navigation = createNavigation();
      const result = {
        valid: true,
        errors: undefined,
      };

      handleTronStakingNavigationResult(navigation, result, 'unstake');

      expect(navigation.goBack).toHaveBeenCalledTimes(1);
      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: {
            title: 'stake.tron.unstake_completed',
            description: 'stake.tron.unstake_completed_description',
            type: 'success',
            closeOnPrimaryButtonPress: true,
          },
        },
      );
    });

    it('navigates to error sheet for unstake when result has errors', () => {
      const navigation = createNavigation();
      const result = {
        valid: false,
        errors: ['Unstake error'],
      };

      handleTronStakingNavigationResult(navigation, result, 'unstake');

      expect(navigation.goBack).not.toHaveBeenCalled();
      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: {
            title: 'stake.tron.unstake_failed',
            description: 'Unstake error',
            type: 'error',
          },
        },
      );
    });

    it('displays localized error message for InsufficientBalance error', () => {
      const navigation = createNavigation();
      const result = {
        valid: false,
        errors: ['InsufficientBalance'],
      };

      handleTronStakingNavigationResult(navigation, result, 'unstake');

      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: {
            title: 'stake.tron.unstake_failed',
            description: 'stake.tron.errors.insufficient_balance',
            type: 'error',
          },
        },
      );
    });
  });
});
