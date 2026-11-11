import { playSelection } from '../../../../util/haptics';
import {
  JIGGLE_BEAT_MS,
  scheduleShuffleUsernameHaptics,
  SHUFFLE_HAPTIC_CLICKS,
} from './UsernameShuffleDie';

jest.mock('../../../../util/haptics');

describe('scheduleShuffleUsernameHaptics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('plays three selection clicks at the start of each jiggle beat', () => {
    scheduleShuffleUsernameHaptics();

    jest.advanceTimersByTime(0);
    expect(playSelection).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(JIGGLE_BEAT_MS[0]);
    expect(playSelection).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(JIGGLE_BEAT_MS[1]);
    expect(playSelection).toHaveBeenCalledTimes(SHUFFLE_HAPTIC_CLICKS);

    jest.advanceTimersByTime(JIGGLE_BEAT_MS[2] + JIGGLE_BEAT_MS[3]);
    expect(playSelection).toHaveBeenCalledTimes(SHUFFLE_HAPTIC_CLICKS);
  });

  it('cancels remaining clicks so a second roll does not stack rattles', () => {
    const cancel = scheduleShuffleUsernameHaptics();

    jest.advanceTimersByTime(0);
    expect(playSelection).toHaveBeenCalledTimes(1);

    cancel();
    jest.advanceTimersByTime(JIGGLE_BEAT_MS[0] + JIGGLE_BEAT_MS[1]);

    expect(playSelection).toHaveBeenCalledTimes(1);
  });
});
