import {
  dismissHeadlessFlow,
  setHeadlessEntryCardTouchThrough,
} from './headlessEntryNavigation';

describe('headlessEntryNavigation', () => {
  describe('setHeadlessEntryCardTouchThrough', () => {
    it('sets the headless entry card to touch-through', () => {
      const setOptions = jest.fn();
      const navigation = {
        getParent: () => ({
          getParent: () => ({
            setOptions,
          }),
        }),
      };

      expect(setHeadlessEntryCardTouchThrough(navigation, true)).toBe(true);

      expect(setOptions).toHaveBeenCalledWith({
        cardStyle: {
          backgroundColor: 'transparent',
          pointerEvents: 'none',
        },
      });
    });

    it('restores the headless entry card to interactive', () => {
      const setOptions = jest.fn();
      const navigation = {
        getParent: () => ({
          getParent: () => ({
            setOptions,
          }),
        }),
      };

      expect(setHeadlessEntryCardTouchThrough(navigation, false)).toBe(true);

      expect(setOptions).toHaveBeenCalledWith({
        cardStyle: {
          backgroundColor: 'transparent',
          pointerEvents: 'auto',
        },
      });
    });

    it('returns false when the headless entry navigator cannot be found', () => {
      expect(setHeadlessEntryCardTouchThrough(undefined, true)).toBe(false);
      expect(
        setHeadlessEntryCardTouchThrough({ getParent: () => undefined }, true),
      ).toBe(false);
    });
  });

  describe('dismissHeadlessFlow', () => {
    it('prefers the outer navigator goBack', () => {
      const outerGoBack = jest.fn();
      const outerPop = jest.fn();
      const parentPop = jest.fn();
      const currentGoBack = jest.fn();
      const navigation = {
        goBack: currentGoBack,
        getParent: () => ({
          pop: parentPop,
          getParent: () => ({
            goBack: outerGoBack,
            pop: outerPop,
          }),
        }),
      };

      expect(dismissHeadlessFlow(navigation)).toBe(true);

      expect(outerGoBack).toHaveBeenCalledTimes(1);
      expect(outerPop).not.toHaveBeenCalled();
      expect(parentPop).not.toHaveBeenCalled();
      expect(currentGoBack).not.toHaveBeenCalled();
    });

    it('falls back through outer pop, parent pop, then current goBack', () => {
      const outerPop = jest.fn();
      expect(
        dismissHeadlessFlow({
          getParent: () => ({
            getParent: () => ({
              pop: outerPop,
            }),
          }),
        }),
      ).toBe(true);
      expect(outerPop).toHaveBeenCalledTimes(1);

      const parentPop = jest.fn();
      expect(
        dismissHeadlessFlow({
          getParent: () => ({
            pop: parentPop,
            getParent: () => undefined,
          }),
        }),
      ).toBe(true);
      expect(parentPop).toHaveBeenCalledTimes(1);

      const currentGoBack = jest.fn();
      expect(dismissHeadlessFlow({ goBack: currentGoBack })).toBe(true);
      expect(currentGoBack).toHaveBeenCalledTimes(1);
    });

    it('returns false when there is no navigation action available', () => {
      expect(dismissHeadlessFlow(undefined)).toBe(false);
      expect(dismissHeadlessFlow({ getParent: () => undefined })).toBe(false);
    });
  });
});
