import { findingHasRequiredConstruct } from './flaky-sticky-pattern-gate';

describe('findingHasRequiredConstruct', () => {
  it('drops J4 when the snippet is a 35290-shaped expect without waitFor', () => {
    const snippet = [
      "it('keeps keyring swap amounts human-readable', () => {",
      '  render(<SwapDetails item={item} />);',
      '  expect(capturedSentToken).toStrictEqual(expected);',
      '});',
    ].join('\n');

    const result = findingHasRequiredConstruct({
      patternId: 'J4',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J4 snippet does not contain waitFor(',
    });
  });

  it('keeps J4 when the snippet contains waitFor around an expect', () => {
    const snippet = `await waitFor(() => {
  expect(screen.getByTestId('result')).toBeOnTheScreen();
});`;

    const result = findingHasRequiredConstruct({
      patternId: 'J4',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({ ok: true });
  });

  it('drops J8 when the file has fake timers and no waitFor', () => {
    const snippet = 'jest.useFakeTimers();';
    const source = `${snippet}\njest.setSystemTime(new Date(2026, 5, 19, 12));`;

    const result = findingHasRequiredConstruct({
      patternId: 'J8',
      snippet,
      source,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J8 file does not contain both fake timers and waitFor',
    });
  });

  it('drops J8 when the snippet cites neither fake timers nor waitFor', () => {
    const snippet = 'expect(true).toBe(true);';
    const source = `jest.useFakeTimers();\nawait waitFor(() => {\n  expect(cb).toHaveBeenCalled();\n});\n${snippet}`;

    const result = findingHasRequiredConstruct({
      patternId: 'J8',
      snippet,
      source,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J8 snippet contains neither fake timers nor waitFor',
    });
  });

  it('keeps J8 when the file has both constructs and the snippet cites waitFor', () => {
    const snippet = `await waitFor(() => {
  expect(mockCallback).toHaveBeenCalled();
});`;
    const source = `jest.useFakeTimers();\n${snippet}`;

    const result = findingHasRequiredConstruct({
      patternId: 'J8',
      snippet,
      source,
    });

    expect(result).toEqual({ ok: true });
  });

  it('keeps J6 when the snippet contains setTimeout', () => {
    const snippet = 'await new Promise((r) => setTimeout(r, 50));';

    const result = findingHasRequiredConstruct({
      patternId: 'J6',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({ ok: true });
  });

  it('drops J6 when the snippet has no real-timer construct', () => {
    const snippet = 'expect(true).toBe(true);';

    const result = findingHasRequiredConstruct({
      patternId: 'J6',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J6 snippet does not contain setTimeout/setInterval/sleep',
    });
  });

  it('drops J6 when the snippet is only jest.setTimeout', () => {
    const snippet = 'jest.setTimeout(10000);';

    const result = findingHasRequiredConstruct({
      patternId: 'J6',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J6 snippet does not contain setTimeout/setInterval/sleep',
    });
  });

  it('keeps J6 when the snippet uses global.setTimeout', () => {
    const snippet = 'await new Promise((r) => global.setTimeout(r, 50));';

    const result = findingHasRequiredConstruct({
      patternId: 'J6',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({ ok: true });
  });

  it('drops J6 when setTimeout appears only in a comment', () => {
    const snippet = '// wait via setTimeout(1000ms) then assert';

    const result = findingHasRequiredConstruct({
      patternId: 'J6',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J6 snippet does not contain setTimeout/setInterval/sleep',
    });
  });

  it('drops J6 when setTimeout appears only in a string', () => {
    const snippet = "const note = 'avoid setTimeout(50) here';";

    const result = findingHasRequiredConstruct({
      patternId: 'J6',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J6 snippet does not contain setTimeout/setInterval/sleep',
    });
  });

  it('keeps J10 when the snippet contains spyOn', () => {
    const snippet = 'const spy = jest.spyOn(Date, "now");';

    const result = findingHasRequiredConstruct({
      patternId: 'J10',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({ ok: true });
  });

  it('drops J10 when the snippet has no spyOn', () => {
    const snippet = 'const now = Date.now();';

    const result = findingHasRequiredConstruct({
      patternId: 'J10',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'J10 snippet does not contain spyOn(',
    });
  });

  it('keeps J3 without a construct check', () => {
    const snippet = 'jest.mocked(fs.readFileSync).mockReturnValue("x");';

    const result = findingHasRequiredConstruct({
      patternId: 'J3',
      snippet,
      source: snippet,
    });

    expect(result).toEqual({ ok: true });
  });
});
