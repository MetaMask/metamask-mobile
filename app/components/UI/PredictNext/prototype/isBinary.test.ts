import { isBinary } from './cards';
import type { ProtoOutcome } from './fixtures';
import { PALETTE } from './palette';

const outcome = (label: string): ProtoOutcome => ({
  id: label.toLowerCase(),
  label,
  price: 50,
  color: PALETTE.green,
});

describe('isBinary', () => {
  it('treats Yes/No and Up/Down markets as binary', () => {
    const yesNo = [outcome('Yes'), outcome('No')];
    const upDown = [outcome('Up'), outcome('Down')];

    const results = [isBinary(yesNo), isBinary(upDown)];

    expect(results).toEqual([true, true]);
  });

  it('keeps named outcomes as rows', () => {
    const teams = [outcome('Panthers'), outcome('Eagles')];
    const candidates = [outcome('Newsom'), outcome('Harris'), outcome('Yes')];

    const results = [isBinary(teams), isBinary(candidates)];

    expect(results).toEqual([false, false]);
  });
});
