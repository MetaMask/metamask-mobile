import {
  EARN_MODULE_REDIRECT_TARGETS,
  EARN_MODULE_REDIRECT_TARGET_TYPES,
} from '../constants/earnModuleEvents';
import { resolveEarnModuleRedirectTargetType } from './earnModuleRedirectTarget';

describe('resolveEarnModuleRedirectTargetType', () => {
  it('resolves known Earn Module screen destinations', () => {
    expect(
      resolveEarnModuleRedirectTargetType(
        EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING,
      ),
    ).toBe(EARN_MODULE_REDIRECT_TARGET_TYPES.SCREEN);
  });

  it('returns undefined for an unknown destination', () => {
    expect(
      resolveEarnModuleRedirectTargetType(
        'unknown' as EARN_MODULE_REDIRECT_TARGETS,
      ),
    ).toBeUndefined();
  });
});
