/**
 * Stage 3 construct gates for J-patterns whose defining syntax is objective.
 *
 * Snippet-in-HEAD still allows a wrong patternId on real code (MCWP-820 /
 * PR 35290: J4 on an `expect` with no waitFor). These checks drop that class
 * of finding. J1/J2/J3/J5/J7/J9 stay prompt-only — they have no unique token.
 */

export type PatternGateInput = {
  patternId: string;
  snippet: string;
  source: string;
};

export type PatternGateResult = { ok: true } | { ok: false; reason: string };

const WAIT_FOR = /waitFor\s*\(/;
const FAKE_TIMERS = /useFakeTimers\s*\(|setSystemTime\s*\(/;
// jest.setTimeout only changes the test timeout; it is not a real-timer barrier.
const REAL_TIMER =
  /(?<!jest\.)setTimeout\s*\(|(?<!jest\.)setInterval\s*\(|\bsleep\s*\(/;
const SPY_ON = /spyOn\s*\(/;

export function findingHasRequiredConstruct(
  input: PatternGateInput,
): PatternGateResult {
  switch (input.patternId) {
    case 'J4':
      if (!WAIT_FOR.test(input.snippet)) {
        return {
          ok: false,
          reason: 'J4 snippet does not contain waitFor(',
        };
      }
      return { ok: true };
    case 'J6':
      if (!REAL_TIMER.test(input.snippet)) {
        return {
          ok: false,
          reason: 'J6 snippet does not contain setTimeout/setInterval/sleep',
        };
      }
      return { ok: true };
    case 'J10':
      if (!SPY_ON.test(input.snippet)) {
        return {
          ok: false,
          reason: 'J10 snippet does not contain spyOn(',
        };
      }
      return { ok: true };
    case 'J8': {
      if (!WAIT_FOR.test(input.source) || !FAKE_TIMERS.test(input.source)) {
        return {
          ok: false,
          reason: 'J8 file does not contain both fake timers and waitFor',
        };
      }
      if (!WAIT_FOR.test(input.snippet) && !FAKE_TIMERS.test(input.snippet)) {
        return {
          ok: false,
          reason: 'J8 snippet contains neither fake timers nor waitFor',
        };
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}
