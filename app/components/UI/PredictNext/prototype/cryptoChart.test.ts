import { pathsOutsideRect } from './cards';

const pill = { left: 40, right: 70, top: 20, bottom: 48 };

describe('pathsOutsideRect', () => {
  it('stops a line at the pill edges', () => {
    expect(
      pathsOutsideRect(
        [
          { x: 0, y: 34 },
          { x: 100, y: 34 },
        ],
        pill,
      ),
    ).toStrictEqual(['M0.0 34.0 L40.0 34.0', 'M70.0 34.0 L100.0 34.0']);
  });

  it('keeps a line that passes above the pill', () => {
    expect(
      pathsOutsideRect(
        [
          { x: 0, y: 8 },
          { x: 100, y: 8 },
        ],
        pill,
      ),
    ).toStrictEqual(['M0.0 8.0 L100.0 8.0']);
  });

  it('keeps the peak of a line that rises out of the pill', () => {
    const paths = pathsOutsideRect(
      [
        { x: 30, y: 34 },
        { x: 55, y: 10 },
        { x: 80, y: 34 },
      ],
      pill,
    );

    expect(paths[0]).toBe('M30.0 34.0 L40.0 24.4');
    expect(paths.some((path) => path.includes('55.0 10.0'))).toBe(true);
    expect(paths[paths.length - 1]).toBe('M70.0 24.4 L80.0 34.0');
  });
});
