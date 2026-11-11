import { resolveReferencePriceWindow } from './referencePriceWindow';

describe('resolveReferencePriceWindow', () => {
  it('keeps a spot market on the spot feed', () => {
    expect(resolveReferencePriceWindow(undefined)).toBeUndefined();
  });

  it('uses 60 seconds for a 30 second market', () => {
    expect(resolveReferencePriceWindow(30)).toBe(60);
  });

  it('keeps a 60 second market on 60 seconds', () => {
    expect(resolveReferencePriceWindow(60)).toBe(60);
  });
});
