import { burstActions, planBurst } from './typing.ts';
import { parseScreenNodes } from './screen.ts';

const node = (id: string, text = '', y = 500, desc = '') =>
  `<android.view.View resource-id="${id}" text="${text}" content-desc="${desc}" bounds="[0,${y}][1000,${y + 100}]" displayed="true"/>`;
const page = (...nodes: string[]) => `<hierarchy>${nodes.join('')}</hierarchy>`;

describe('burst typing (one page source, one touch sequence)', () => {
  const key = (id: string, x: number, y: number) =>
    `<android.view.View resource-id="${id}" text="" content-desc="" bounds="[${x - 50},${y - 50}][${x + 50},${y + 50}]" displayed="true"/>`;
  const keypad = [
    key('keypad-key-0', 504, 2046),
    key('keypad-key-1', 185, 1641),
    key('keypad-key-9', 824, 1641),
    key('keypad-key-dot', 185, 2046),
    key('keypad-delete-button', 824, 2046),
  ];

  it('plans every tap from one page source, clearing a non-empty field first', () => {
    const empty = parseScreenNodes(
      page(node('source-token-area-input', '0', 300), ...keypad),
    );
    const plan = planBurst(
      empty,
      '0.01',
      { strategy: 'testID', value: 'source-token-area-input' },
      2244,
    );
    expect(plan).toEqual({
      clear: [],
      keys: [
        { x: 504, y: 2046 },
        { x: 185, y: 2046 },
        { x: 504, y: 2046 },
        { x: 185, y: 1641 },
      ],
    });
    const filled = parseScreenNodes(
      page(node('source-token-area-input', '12', 300), ...keypad),
    );
    expect(
      planBurst(
        filled,
        '1',
        { strategy: 'testID', value: 'source-token-area-input' },
        2244,
      )?.clear,
    ).toEqual([
      { x: 824, y: 2046 },
      { x: 824, y: 2046 },
    ]);
    // Keypad not open yet: no plan, the caller polls again.
    expect(
      planBurst(
        parseScreenNodes(page(node('source-token-area-input', '0', 300))),
        '0.01',
        { strategy: 'testID', value: 'source-token-area-input' },
        2244,
      ),
    ).toBeNull();
    // A non-empty field with no delete key visible cannot be cleared.
    expect(
      planBurst(
        parseScreenNodes(
          page(
            node('source-token-area-input', '5', 300),
            ...keypad.slice(0, 4),
          ),
        ),
        '1',
        { strategy: 'testID', value: 'source-token-area-input' },
        2244,
      ),
    ).toBeNull();
  });

  it('builds one sequence with short fixed gaps and no gap before the first key', () => {
    const steps = burstActions([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ]);
    const pauses = steps
      .filter((a) => a.type === 'pause')
      .map((a) => a.duration);
    // press, gap, press, gap, press
    expect(pauses).toEqual([40, 100, 40, 100, 40]);
    expect(steps.filter((a) => a.type === 'pointerDown')).toHaveLength(3);
    expect(steps[0]).toEqual({ type: 'pointerMove', duration: 0, x: 1, y: 2 });
    // Four short keys stay well under a second of finger time on the device.
    const total = burstActions(Array(4).fill({ x: 0, y: 0 })).reduce(
      (sum, a) => sum + (Number(a.duration) || 0),
      0,
    );
    expect(total).toBeLessThan(1000);
  });
});
