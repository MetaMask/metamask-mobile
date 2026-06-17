///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { getBaseReserveFromExtra } from './base-reserve-from-extra';

describe('getBaseReserveFromExtra', () => {
  it('returns baseReserve when valid', () => {
    expect(getBaseReserveFromExtra({ baseReserve: '1.5' })).toBe('1.5');
  });

  it('returns undefined when baseReserve is missing', () => {
    expect(getBaseReserveFromExtra(undefined)).toBeUndefined();
    expect(getBaseReserveFromExtra({})).toBeUndefined();
  });

  it('returns undefined when baseReserve is invalid', () => {
    expect(getBaseReserveFromExtra({ baseReserve: '-1' })).toBeUndefined();
    expect(getBaseReserveFromExtra({ baseReserve: 'abc' })).toBeUndefined();
  });
});
///: END:ONLY_INCLUDE_IF
