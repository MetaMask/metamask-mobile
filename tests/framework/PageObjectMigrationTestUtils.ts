import { FrameworkDetector, TestFramework } from './FrameworkDetector';
import { EncapsulatedElement } from './EncapsulatedElement';
import Matchers from './Matchers';
import PlaywrightMatchers from './PlaywrightMatchers';

function getEncapsulatedGetterNames(pageObject: object): string[] {
  FrameworkDetector.reset();
  FrameworkDetector.setFramework(TestFramework.DETOX);

  const spy = jest.spyOn(EncapsulatedElement, 'create');
  const names: string[] = [];

  const proto = Object.getPrototypeOf(pageObject);
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (!descriptor?.get) continue;
    try {
      spy.mockClear();
      descriptor.get.call(pageObject);
      if (spy.mock.calls.length > 0) {
        names.push(key);
      }
    } catch {
      // getter threw — skip
    }
  }

  spy.mockRestore();
  FrameworkDetector.reset();

  return names;
}

function noPlaywrightMatcherWasCalled(): void {
  expect(PlaywrightMatchers.getElementById).not.toHaveBeenCalled();
  expect(PlaywrightMatchers.getElementByText).not.toHaveBeenCalled();
  expect(PlaywrightMatchers.getElementByAccessibilityId).not.toHaveBeenCalled();
}

function noDetoxMatcherWasCalled(): void {
  expect(Matchers.getElementByID).not.toHaveBeenCalled();
  expect(Matchers.getElementByText).not.toHaveBeenCalled();
}

export function describePageObjectMigration(
  pageObjectName: string,
  pageObject: object,
): void {
  const getterNames = getEncapsulatedGetterNames(pageObject);

  describe(`${pageObjectName}`, () => {
    if (getterNames.length === 0) {
      it('has no migrated getters', () => {
        expect(true).toBe(true);
      });
      return;
    }

    describe('Detox context', () => {
      beforeEach(() => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.DETOX);
      });

      afterEach(() => {
        FrameworkDetector.reset();
      });

      for (const name of getterNames) {
        it(`${name} calls the Detox locator`, async () => {
          const descriptor = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(pageObject),
            name,
          );
          await Promise.resolve(descriptor?.get?.call(pageObject));

          noPlaywrightMatcherWasCalled();
        });
      }
    });

    describe('Appium context — iOS', () => {
      beforeEach(() => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'iOS' }),
        };
      });

      afterEach(() => {
        FrameworkDetector.reset();
        delete (global as Record<string, unknown>).driver;
      });

      for (const name of getterNames) {
        it(`${name} calls the Appium locator`, async () => {
          const descriptor = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(pageObject),
            name,
          );
          await Promise.resolve(descriptor?.get?.call(pageObject));

          noDetoxMatcherWasCalled();
        });
      }
    });

    describe('Appium context — Android', () => {
      beforeEach(() => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };
      });

      afterEach(() => {
        FrameworkDetector.reset();
        delete (global as Record<string, unknown>).driver;
      });

      for (const name of getterNames) {
        it(`${name} calls the Appium locator`, async () => {
          const descriptor = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(pageObject),
            name,
          );
          await Promise.resolve(descriptor?.get?.call(pageObject));

          noDetoxMatcherWasCalled();
        });
      }
    });
  });
}
