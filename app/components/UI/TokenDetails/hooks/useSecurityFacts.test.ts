import { renderHook } from '@testing-library/react-native';
import {
  CBXRP_VERIFIED,
  ETHOS_WARNING,
} from '../utils/__fixtures__/securityData';
import { useSecurityFacts } from './useSecurityFacts';

const renderFacts = (
  opts: Partial<Parameters<typeof useSecurityFacts>[0]> = {},
) =>
  renderHook(() =>
    useSecurityFacts({
      securityData: CBXRP_VERIFIED,
      isLoading: false,
      error: null,
      ...opts,
    }),
  );

describe('useSecurityFacts', () => {
  it('derives the payload once it has one', () => {
    const { result } = renderFacts({ securityData: ETHOS_WARNING });

    expect(result.current.verdict).toBe('medium_risk');
    expect(result.current.risks).toHaveLength(5);
  });

  /**
   * Loading and no-data deliberately share `pending`.
   *
   * Both mean "no answer yet", and splitting them would put a second neutral
   * state on screen saying the same thing in different words. This is also why
   * `deriveSecurityFacts` needs no `pending` branch of its own: it is never
   * reached in either state.
   */
  it.each([
    ['the request is in flight', { isLoading: true }],
    ['the response carries no entry', { securityData: null }],
    [
      'the response is still loading and carries nothing yet',
      { isLoading: true, securityData: null },
    ],
  ] as const)('reports pending while %s', (_label, opts) => {
    const { result } = renderFacts(opts);

    expect(result.current.verdict).toBe('pending');
    expect(result.current.risks).toStrictEqual([]);
    expect(result.current.checks).toStrictEqual({});
  });

  // A token we could not ask about is indistinguishable from one nobody has
  // screened, so it must not borrow the green of a clean scan.
  it('reports unscreened when the request failed', () => {
    const { result } = renderFacts({ error: new Error('offline') });

    expect(result.current.verdict).toBe('unscreened');
    expect(result.current.risks).toStrictEqual([]);
  });

  // The error wins over a stale payload: showing checks derived from data we
  // know we could not refresh would present the old answer as the current one.
  it('prefers the error over a payload it arrived with', () => {
    const { result } = renderFacts({
      securityData: ETHOS_WARNING,
      error: new Error('offline'),
    });

    expect(result.current.verdict).toBe('unscreened');
    expect(result.current.risks).toStrictEqual([]);
  });

  // The tab takes `facts` as a whole and renders five sections off it, so a
  // fresh object every render would re-render all of them on every tick of the
  // unrelated "updated N min ago" clock.
  it('keeps one object across renders of the same request', () => {
    const { result, rerender } = renderFacts();
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });

  it('derives again when the payload changes', () => {
    const { result } = renderFacts();

    expect(result.current.verdict).toBe('screened');

    const { result: next } = renderFacts({ securityData: ETHOS_WARNING });

    expect(next.current.verdict).toBe('medium_risk');
  });
});
