import {
  getCrossedHapticMarks,
  percentToThumbLeft,
  THUMB_SIZE,
  touchXToPercent,
} from './BatchSellReviewSlider';

describe('BatchSellReviewSlider', () => {
  const trackWidth = 200;

  it('places the thumb fully on the track at 0%', () => {
    const left = percentToThumbLeft(0, trackWidth);

    expect(left).toBe(0);
  });

  it('places the thumb fully on the track at 100%', () => {
    const left = percentToThumbLeft(100, trackWidth);

    expect(left).toBe(trackWidth - THUMB_SIZE);
  });

  it('centers the thumb on the track at 50%', () => {
    const left = percentToThumbLeft(50, trackWidth);

    expect(left + THUMB_SIZE / 2).toBe(trackWidth / 2);
  });

  it('maps a touch at the track start to 0%', () => {
    const percent = touchXToPercent(0, trackWidth);

    expect(percent).toBe(0);
  });

  it('maps a touch at the track end to 100%', () => {
    const percent = touchXToPercent(trackWidth, trackWidth);

    expect(percent).toBe(100);
  });

  it('returns the 25, 50, and 75 marks a drag crosses', () => {
    const marks = getCrossedHapticMarks(10, 80);

    expect(marks).toEqual([25, 50, 75]);
  });

  it('returns no marks when the value stays between thresholds', () => {
    const marks = getCrossedHapticMarks(10, 20);

    expect(marks).toEqual([]);
  });
});
