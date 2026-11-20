import { isSafeDismissControl } from '../ai-locator/ClaudeInterruptionRecoveryProvider';
import {
  findInterruptingScreensInPageSource,
  INTERRUPTING_SCREEN_REGISTRY,
  pageSourceContainsLocator,
} from './InterruptingScreenRegistry';

describe('InterruptingScreenRegistry', () => {
  describe('pageSourceContainsLocator', () => {
    it('matches an Android resource-id attribute', () => {
      const pageSource =
        '<android.view.ViewGroup resource-id="experience-enhancer-modal-bottom-sheet"/>';

      expect(
        pageSourceContainsLocator(pageSource, {
          strategy: 'testID',
          value: 'experience-enhancer-modal-bottom-sheet',
        }),
      ).toBe(true);
    });

    it('matches an iOS label attribute for text locators', () => {
      const pageSource =
        '<XCUIElementTypeStaticText name="PREDICT AND WIN" label="PREDICT AND WIN"/>';

      expect(
        pageSourceContainsLocator(pageSource, {
          strategy: 'text',
          value: 'PREDICT AND WIN',
        }),
      ).toBe(true);
    });

    it('does not match a longer testID that shares the prefix', () => {
      const pageSource =
        '<android.view.View resource-id="perps-gtm-modal-title"/>';

      expect(
        pageSourceContainsLocator(pageSource, {
          strategy: 'testID',
          value: 'perps-gtm-modal',
        }),
      ).toBe(false);
    });

    it('matches XML-escaped values', () => {
      const pageSource = '<android.widget.TextView text="Fees &amp; more"/>';

      expect(
        pageSourceContainsLocator(pageSource, {
          strategy: 'text',
          value: 'Fees & more',
        }),
      ).toBe(true);
    });
  });

  describe('findInterruptingScreensInPageSource', () => {
    it('detects the Experience Enhancer consent sheet over wallet home', () => {
      const pageSource = [
        '<hierarchy>',
        '<android.view.ViewGroup resource-id="wallet-screen"/>',
        '<android.view.ViewGroup resource-id="experience-enhancer-modal-bottom-sheet">',
        '<android.widget.Button resource-id="experience-enhancer-modal-cancel-button" text="No thanks"/>',
        '<android.widget.Button resource-id="experience-enhancer-modal-accept-button" text="I agree"/>',
        '</android.view.ViewGroup>',
        '</hierarchy>',
      ].join('');

      const screens = findInterruptingScreensInPageSource(pageSource);

      expect(screens.map((screen) => screen.name)).toEqual([
        'experience-enhancer-marketing-consent',
      ]);
    });

    it('returns nothing for a clean wallet home', () => {
      const pageSource =
        '<hierarchy><android.view.ViewGroup resource-id="wallet-screen"/></hierarchy>';

      expect(findInterruptingScreensInPageSource(pageSource)).toEqual([]);
    });
  });

  describe('registry entries', () => {
    it('has unique names', () => {
      const names = INTERRUPTING_SCREEN_REGISTRY.map((screen) => screen.name);

      expect(new Set(names).size).toBe(names.length);
    });

    it.each(
      INTERRUPTING_SCREEN_REGISTRY.map((screen) => [screen.name, screen]),
    )('%s only dismisses with non-consenting controls', (_name, screen) => {
      expect(screen.detect.length).toBeGreaterThan(0);
      expect(screen.dismiss.length).toBeGreaterThan(0);
      for (const locator of screen.dismiss) {
        expect(isSafeDismissControl([locator.value])).toBe(true);
      }
    });
  });
});
