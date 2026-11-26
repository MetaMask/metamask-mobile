import {
  ImpactMoment,
  fireImpact,
  playSelection,
} from '../../../../util/haptics';
import {
  CASHBACK_COUNT_UP_MS,
  playCashbackCountUpHaptics,
} from './cashbackHaptics';

jest.mock('../../../../util/haptics');

describe('playCashbackCountUpHaptics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ticks every 100ms while the balance rolls, then lands with an impact', () => {
    playCashbackCountUpHaptics();

    jest.advanceTimersByTime(CASHBACK_COUNT_UP_MS - 1);
    expect(playSelection).toHaveBeenCalledTimes(4);
    expect(fireImpact).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fireImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
  });

  it('only plays the landing impact with Reduce Motion', () => {
    playCashbackCountUpHaptics({ reduceMotion: true });

    jest.runAllTimers();
    expect(playSelection).not.toHaveBeenCalled();
    expect(fireImpact).toHaveBeenCalledTimes(1);
  });

  it('stops pending haptics when cancelled', () => {
    const cancel = playCashbackCountUpHaptics();

    jest.advanceTimersByTime(150);
    cancel();
    jest.runAllTimers();
    expect(playSelection).toHaveBeenCalledTimes(2);
    expect(fireImpact).not.toHaveBeenCalled();
  });
});
