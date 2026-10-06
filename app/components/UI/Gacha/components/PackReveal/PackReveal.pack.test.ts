import { getPackLayout } from './PackReveal.pack';

describe('getPackLayout', () => {
  it('fits a narrow scene by width and insets the seal from the welded edges', () => {
    const layout = getPackLayout({ width: 400, height: 600 });

    expect(layout.packWidth).toBeCloseTo(452);
    expect(layout.packHeight).toBeCloseTo(904);
    expect(layout.packTop).toBeCloseTo(24);
    expect(layout.sealY).toBeCloseTo(108.48);
    expect(layout.sealSceneY).toBeCloseTo(132.48);
    expect(layout.sealWidth).toBeCloseTo(388.72);
  });

  it('fits a short scene by height', () => {
    const layout = getPackLayout({ width: 400, height: 300 });

    expect(layout.packWidth).toBeCloseTo(228);
    expect(layout.packHeight).toBeCloseTo(456);
  });
});
