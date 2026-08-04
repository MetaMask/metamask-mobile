import { createMetaMaskWidget } from './createMetaMaskWidget';

describe('createMetaMaskWidget (non-iOS fallback)', () => {
  it('returns a no-op widget that never throws', async () => {
    const layout = jest.fn();
    const widget = createMetaMaskWidget('TestWidget', layout);

    expect(() => widget.reload()).not.toThrow();
    expect(() => widget.updateSnapshot({ foo: 'bar' })).not.toThrow();
    expect(() => widget.updateTimeline([])).not.toThrow();
    await expect(widget.getTimeline()).resolves.toEqual([]);
    expect(layout).not.toHaveBeenCalled();
  });
});
