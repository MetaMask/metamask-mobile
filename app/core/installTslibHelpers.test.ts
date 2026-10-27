import './installTslibHelpers';

describe('installTslibHelpers', () => {
  it('pins the helpers on the global object when imported', () => {
    const globalTarget = globalThis as unknown as Record<string, unknown>;
    const helper = globalTarget.__classPrivateFieldGet;

    globalTarget.__classPrivateFieldGet = () => undefined;

    expect(helper).toEqual(expect.any(Function));
    expect(globalTarget.__classPrivateFieldGet).toBe(helper);
  });
});
