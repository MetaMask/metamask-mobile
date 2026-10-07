import { resolveReferencePriceWindow } from './referencePriceWindow';

describe('resolveReferencePriceWindow', () => {
  it('keeps a 30 second window when PolyBolt is off', () => {
    expect(resolveReferencePriceWindow(30, false)).toBe(30);
  });

  it('keeps a spot market on the spot feed when PolyBolt is on', () => {
    expect(resolveReferencePriceWindow(undefined, true)).toBeUndefined();
  });

  it('uses 60 seconds for a 30 second market when PolyBolt is on', () => {
    expect(resolveReferencePriceWindow(30, true)).toBe(60);
  });

  it('keeps a 60 second market on 60 seconds when PolyBolt is on', () => {
    expect(resolveReferencePriceWindow(60, true)).toBe(60);
  });
});
