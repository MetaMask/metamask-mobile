import { PERPS_EVENT_VALUE, type Position } from '@metamask/perps-controller';
import { derivePerpsTradeAction } from './deriveTradeAction';

const positionWithSize = (size: string): Pick<Position, 'size'> => ({ size });

describe('derivePerpsTradeAction', () => {
  it('returns create_position when there is no existing position', () => {
    expect(derivePerpsTradeAction(null, 'long')).toBe(
      PERPS_EVENT_VALUE.ACTION.CREATE_POSITION,
    );
    expect(derivePerpsTradeAction(undefined, 'short')).toBe(
      PERPS_EVENT_VALUE.ACTION.CREATE_POSITION,
    );
  });

  it('returns create_position when the existing position size is zero', () => {
    expect(derivePerpsTradeAction(positionWithSize('0'), 'long')).toBe(
      PERPS_EVENT_VALUE.ACTION.CREATE_POSITION,
    );
  });

  it('returns increase_exposure when the order is the same direction as the position', () => {
    expect(derivePerpsTradeAction(positionWithSize('1.5'), 'long')).toBe(
      PERPS_EVENT_VALUE.ACTION.INCREASE_EXPOSURE,
    );
    expect(derivePerpsTradeAction(positionWithSize('-1.5'), 'short')).toBe(
      PERPS_EVENT_VALUE.ACTION.INCREASE_EXPOSURE,
    );
  });

  it('returns flip_long_to_short when a long position is reversed by a short order', () => {
    expect(derivePerpsTradeAction(positionWithSize('2'), 'short')).toBe(
      PERPS_EVENT_VALUE.ACTION.FLIP_LONG_TO_SHORT,
    );
  });

  it('returns flip_short_to_long when a short position is reversed by a long order', () => {
    expect(derivePerpsTradeAction(positionWithSize('-2'), 'long')).toBe(
      PERPS_EVENT_VALUE.ACTION.FLIP_SHORT_TO_LONG,
    );
  });
});
