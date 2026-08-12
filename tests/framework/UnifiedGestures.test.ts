/**
 * UnifiedGestures unit tests
 *
 * Verifies the two execution paths for each gesture method:
 * 1. Raw Selector - resolve(elem) is called, strategy receives the resolved element
 * 2. EncapsulatedElementType - passed straight through, resolve is never called
 */

// ── Mocks (must be declared before imports) ─────────────────────────────────

const mockStrategy = {
  tap: jest.fn(),
  waitAndTap: jest.fn(),
  typeText: jest.fn(),
  replaceText: jest.fn(),
  swipe: jest.fn(),
  scrollToElement: jest.fn(),
  longPress: jest.fn(),
  dblTap: jest.fn(),
  tapAtPoint: jest.fn(),
  tapAtIndex: jest.fn(),
};

jest.mock('./GestureStrategy.ts', () => ({
  DetoxGestureStrategy: jest.fn(() => mockStrategy),
  AppiumGestureStrategy: jest.fn(() => mockStrategy),
}));

const mockResolvedElement = { tap: jest.fn() } as unknown as DetoxElement;
const mockResolve = jest.fn().mockReturnValue(mockResolvedElement);

jest.mock('./Selector.ts', () => {
  const actual = jest.requireActual('./Selector.ts');
  return {
    ...actual,
    resolve: (...args: unknown[]) => mockResolve(...args),
  };
});

// ── Imports ──────────────────────────────────────────────────────────────────

import UnifiedGestures from './UnifiedGestures.ts';
import { type Selector } from './Selector.ts';
import { type EncapsulatedElementType } from './EncapsulatedElement.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const selector: Selector = { testID: 'my-button' };

/** A mock EncapsulatedElementType — isSelector returns false for this */
const encapsulatedElem = {
  __isElement: true,
} as unknown as EncapsulatedElementType;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UnifiedGestures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UnifiedGestures.resetStrategy();
  });

  describe('tap', () => {
    it('resolves a Selector before calling strategy.tap', async () => {
      await UnifiedGestures.tap(selector);
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.tap).toHaveBeenCalledWith(
        mockResolvedElement,
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.tap', async () => {
      await UnifiedGestures.tap(encapsulatedElem);
      expect(mockResolve).not.toHaveBeenCalled();
      expect(mockStrategy.tap).toHaveBeenCalledWith(
        encapsulatedElem,
        undefined,
      );
    });

    it('forwards options to strategy.tap', async () => {
      const opts = { timeout: 5000 };
      await UnifiedGestures.tap(encapsulatedElem, opts);
      expect(mockStrategy.tap).toHaveBeenCalledWith(encapsulatedElem, opts);
    });
  });

  describe('waitAndTap', () => {
    it('resolves a Selector before calling strategy.waitAndTap', async () => {
      await UnifiedGestures.waitAndTap(selector);
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.waitAndTap).toHaveBeenCalledWith(
        mockResolvedElement,
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.waitAndTap', async () => {
      await UnifiedGestures.waitAndTap(encapsulatedElem);
      expect(mockResolve).not.toHaveBeenCalled();
      expect(mockStrategy.waitAndTap).toHaveBeenCalledWith(
        encapsulatedElem,
        undefined,
      );
    });
  });

  describe('typeText', () => {
    it('resolves a Selector before calling strategy.typeText', async () => {
      await UnifiedGestures.typeText(selector, 'hello');
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.typeText).toHaveBeenCalledWith(
        mockResolvedElement,
        'hello',
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.typeText', async () => {
      await UnifiedGestures.typeText(encapsulatedElem, 'hello');
      expect(mockResolve).not.toHaveBeenCalled();
      expect(mockStrategy.typeText).toHaveBeenCalledWith(
        encapsulatedElem,
        'hello',
        undefined,
      );
    });

    it('forwards hideKeyboard option to strategy.typeText', async () => {
      await UnifiedGestures.typeText(encapsulatedElem, 'hello', {
        hideKeyboard: false,
      });
      expect(mockStrategy.typeText).toHaveBeenCalledWith(
        encapsulatedElem,
        'hello',
        { hideKeyboard: false },
      );
    });
  });

  describe('replaceText', () => {
    it('resolves a Selector before calling strategy.replaceText', async () => {
      await UnifiedGestures.replaceText(selector, 'new');
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.replaceText).toHaveBeenCalledWith(
        mockResolvedElement,
        'new',
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.replaceText', async () => {
      await UnifiedGestures.replaceText(encapsulatedElem, 'new');
      expect(mockResolve).not.toHaveBeenCalled();
    });
  });

  describe('swipe', () => {
    it('resolves a Selector before calling strategy.swipe', async () => {
      await UnifiedGestures.swipe(selector, 'up');
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.swipe).toHaveBeenCalledWith(
        mockResolvedElement,
        'up',
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.swipe', async () => {
      await UnifiedGestures.swipe(encapsulatedElem, 'down');
      expect(mockResolve).not.toHaveBeenCalled();
      expect(mockStrategy.swipe).toHaveBeenCalledWith(
        encapsulatedElem,
        'down',
        undefined,
      );
    });
  });

  describe('scrollToElement', () => {
    it('resolves a Selector before calling strategy.scrollToElement', async () => {
      const scrollView = Promise.resolve({} as Detox.NativeMatcher);
      await UnifiedGestures.scrollToElement(selector, scrollView);
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.scrollToElement).toHaveBeenCalledWith(
        mockResolvedElement,
        scrollView,
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.scrollToElement', async () => {
      const scrollView = Promise.resolve({} as Detox.NativeMatcher);
      await UnifiedGestures.scrollToElement(encapsulatedElem, scrollView);
      expect(mockResolve).not.toHaveBeenCalled();
    });
  });

  describe('longPress', () => {
    it('resolves a Selector before calling strategy.longPress', async () => {
      await UnifiedGestures.longPress(selector);
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.longPress).toHaveBeenCalledWith(
        mockResolvedElement,
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.longPress', async () => {
      await UnifiedGestures.longPress(encapsulatedElem);
      expect(mockResolve).not.toHaveBeenCalled();
    });
  });

  describe('dblTap', () => {
    it('resolves a Selector before calling strategy.dblTap', async () => {
      await UnifiedGestures.dblTap(selector);
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.dblTap).toHaveBeenCalledWith(
        mockResolvedElement,
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.dblTap', async () => {
      await UnifiedGestures.dblTap(encapsulatedElem);
      expect(mockResolve).not.toHaveBeenCalled();
    });
  });

  describe('tapAtPoint', () => {
    const point = { x: 10, y: 20 };

    it('resolves a Selector before calling strategy.tapAtPoint', async () => {
      await UnifiedGestures.tapAtPoint(selector, point);
      expect(mockResolve).toHaveBeenCalledWith(selector);
      expect(mockStrategy.tapAtPoint).toHaveBeenCalledWith(
        mockResolvedElement,
        point,
        undefined,
      );
    });

    it('passes EncapsulatedElementType directly to strategy.tapAtPoint', async () => {
      await UnifiedGestures.tapAtPoint(encapsulatedElem, point);
      expect(mockResolve).not.toHaveBeenCalled();
    });
  });

  describe('tapAtIndex', () => {
    it('passes elem and index directly to strategy.tapAtIndex (no Selector path)', async () => {
      await UnifiedGestures.tapAtIndex(encapsulatedElem, 2);
      expect(mockResolve).not.toHaveBeenCalled();
      expect(mockStrategy.tapAtIndex).toHaveBeenCalledWith(
        encapsulatedElem,
        2,
        undefined,
      );
    });
  });

  describe('strategy caching', () => {
    it('reuses the same strategy instance across calls', async () => {
      await UnifiedGestures.tap(encapsulatedElem);
      await UnifiedGestures.tap(encapsulatedElem);
      const { DetoxGestureStrategy } = jest.requireMock('./GestureStrategy.ts');
      expect(DetoxGestureStrategy).toHaveBeenCalledTimes(1);
    });

    it('creates a fresh strategy after resetStrategy()', async () => {
      await UnifiedGestures.tap(encapsulatedElem);
      UnifiedGestures.resetStrategy();
      await UnifiedGestures.tap(encapsulatedElem);
      const { DetoxGestureStrategy } = jest.requireMock('./GestureStrategy.ts');
      expect(DetoxGestureStrategy).toHaveBeenCalledTimes(2);
    });
  });
});
