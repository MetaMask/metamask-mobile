import {
  BOTTOM_SHEET_NAMES,
  MONEY_URLS,
  REDIRECT_TARGETS_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import Logger from '../../../../util/Logger';

const SCREEN_TARGETS = new Set<string>(Object.values(SCREEN_NAMES));
const BOTTOM_SHEET_TARGETS = new Set<string>(Object.values(BOTTOM_SHEET_NAMES));
const URL_TARGETS = new Set<string>(Object.values(MONEY_URLS));

const LOG_PREFIX = '[moneyAnalytics]';

/**
 * Resolves a redirect target's type from the target itself. A target's type is
 * a fact about the target, not something callers should restate, so this is the
 * single source of truth. Fails loud if a target has no category.
 *
 * Resolution is precedence-ordered, so a value duplicated across SCREEN_NAMES,
 * BOTTOM_SHEET_NAMES, or MONEY_URLS would be silently misclassified. Keep these
 * groups disjoint when adding targets (enforced by moneyEvents.test.ts).
 */
export const resolveRedirectTargetType = (
  target: SCREEN_NAMES | BOTTOM_SHEET_NAMES | MONEY_URLS,
): REDIRECT_TARGETS_TYPES | undefined => {
  if (SCREEN_TARGETS.has(target)) return REDIRECT_TARGETS_TYPES.SCREEN;
  if (BOTTOM_SHEET_TARGETS.has(target)) {
    return REDIRECT_TARGETS_TYPES.BOTTOM_SHEET;
  }
  if (URL_TARGETS.has(target)) return REDIRECT_TARGETS_TYPES.EXTERNAL_BROWSER;
  Logger.error(
    new Error(`${LOG_PREFIX} No redirect_target_type for target: ${target}`),
  );
};
