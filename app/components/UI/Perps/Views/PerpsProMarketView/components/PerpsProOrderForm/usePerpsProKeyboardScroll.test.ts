import {
  getKeyboardScrollDelta,
  KEYBOARD_CLEARANCE_PX,
} from './usePerpsProKeyboardScroll';

// Screen-space px, matching `measureInWindow`: a 400px band between a header
// ending at 100 and a keyboard starting at 500.
const VIEWPORT_TOP = 100;
const KEYBOARD_TOP = 500;

const deltaFor = ({
  cardTop,
  cardHeight,
}: {
  cardTop: number;
  cardHeight: number;
}) =>
  getKeyboardScrollDelta({
    cardTop,
    cardBottom: cardTop + cardHeight,
    viewportTop: VIEWPORT_TOP,
    keyboardTop: KEYBOARD_TOP,
  });

describe('getKeyboardScrollDelta', () => {
  describe('card below the keyboard', () => {
    it('scrolls down by the overlap plus the clearance', () => {
      // Bottom at 550, i.e. 50px into the keyboard.
      const delta = deltaFor({ cardTop: 400, cardHeight: 150 });

      expect(delta).toBe(550 + KEYBOARD_CLEARANCE_PX - KEYBOARD_TOP);
    });

    it('stops short rather than pushing the card top off screen', () => {
      // 20px of headroom against 165px of overlap: capped, so the bottom stays
      // partly covered rather than hiding the value being typed.
      const delta = deltaFor({ cardTop: VIEWPORT_TOP + 20, cardHeight: 530 });

      expect(delta).toBe(20);
    });

    it('does not scroll when the card already clears the keyboard', () => {
      // Bottom at 350, comfortably above the keyboard.
      expect(deltaFor({ cardTop: 200, cardHeight: 150 })).toBe(0);
    });

    it('leaves the exact clearance untouched', () => {
      // Bottom sits exactly KEYBOARD_CLEARANCE_PX above the keyboard.
      const cardTop = KEYBOARD_TOP - KEYBOARD_CLEARANCE_PX - 150;

      expect(deltaFor({ cardTop, cardHeight: 150 })).toBe(0);
    });
  });

  describe('card above the viewport', () => {
    it('scrolls up to pull the card back into view', () => {
      // 40px off the top of the visible band.
      const delta = deltaFor({ cardTop: VIEWPORT_TOP - 40, cardHeight: 150 });

      expect(delta).toBe(-40);
    });

    it('does not pull so far up that the card re-enters the keyboard', () => {
      // Off the top by 300px, but the keyboard clearance line allows far less.
      const cardTop = VIEWPORT_TOP - 300;
      const cardHeight = 650;
      const overlap =
        cardTop + cardHeight + KEYBOARD_CLEARANCE_PX - KEYBOARD_TOP;

      expect(deltaFor({ cardTop, cardHeight })).toBe(overlap);
    });
  });

  it('does nothing when the card already sits inside the band', () => {
    expect(deltaFor({ cardTop: VIEWPORT_TOP + 50, cardHeight: 200 })).toBe(0);
  });
});
