import {
  EARN_MODULE_REDIRECT_TARGETS,
  EARN_MODULE_REDIRECT_TARGET_TYPES,
} from '../constants/earnModuleEvents';
import Logger from '../../../../util/Logger';
import { resolveEarnModuleRedirectTargetType } from './earnModuleRedirectTarget';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockLoggerError = jest.mocked(Logger.error);

describe('resolveEarnModuleRedirectTargetType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
    EARN_MODULE_REDIRECT_TARGETS.EARN_SEARCH_LIST,
    EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS,
    EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT,
    EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT,
    EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT,
    EARN_MODULE_REDIRECT_TARGETS.MONEY_HOME,
    EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING,
    EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
  ])('resolves %s as a screen destination', (target) => {
    const result = resolveEarnModuleRedirectTargetType(target);

    expect(result).toBe(EARN_MODULE_REDIRECT_TARGET_TYPES.SCREEN);
  });

  it('resolves strategy selection as a bottom sheet destination', () => {
    const result = resolveEarnModuleRedirectTargetType(
      EARN_MODULE_REDIRECT_TARGETS.STRATEGY_SELECTION_BOTTOM_SHEET,
    );

    expect(result).toBe(EARN_MODULE_REDIRECT_TARGET_TYPES.BOTTOM_SHEET);
  });

  it('returns undefined for an unknown destination', () => {
    const result = resolveEarnModuleRedirectTargetType(
      'unknown' as EARN_MODULE_REDIRECT_TARGETS,
    );

    expect(result).toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      new Error('[earnModuleAnalytics] Unknown redirect target: unknown'),
    );
  });
});
