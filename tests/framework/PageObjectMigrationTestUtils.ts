import { FrameworkDetector, TestFramework } from './FrameworkDetector';
import { EncapsulatedElement } from './EncapsulatedElement';
import Matchers from './Matchers';
import PlaywrightMatchers from './PlaywrightMatchers';

function findPageObjectsWithEncapsulated(dir: string): string[] {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');
  const results: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findPageObjectsWithEncapsulated(fullPath));
      continue;
    }

    if (!entry.name.endsWith('.ts') || entry.name.includes('.test.')) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    if (source.includes('encapsulated(')) {
      results.push(fullPath);
    }
  }

  return results;
}

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

function atLeastOneDetoxMatcherWasCalled(): void {
  const detoxCallCount =
    (Matchers.getElementByID as jest.Mock).mock.calls.length +
    (Matchers.getElementByText as jest.Mock).mock.calls.length;
  expect(detoxCallCount).toBeGreaterThan(0);
}

function atLeastOnePlaywrightMatcherWasCalled(): void {
  const playwrightCallCount =
    (PlaywrightMatchers.getElementById as jest.Mock).mock.calls.length +
    (PlaywrightMatchers.getElementByText as jest.Mock).mock.calls.length +
    (PlaywrightMatchers.getElementByAccessibilityId as jest.Mock).mock.calls
      .length;
  expect(playwrightCallCount).toBeGreaterThan(0);
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

function describeGetters(
  pageObjectName: string,
  pageObject: object,
  getterNames: string[],
): void {
  describe(`${pageObjectName}`, () => {
    describe('Detox context', () => {
      beforeEach(() => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.DETOX);
      });

      afterEach(() => FrameworkDetector.reset());

      for (const name of getterNames) {
        it(`${name} calls the Detox locator`, async () => {
          const descriptor = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(pageObject),
            name,
          );
          await Promise.resolve(descriptor?.get?.call(pageObject));

          atLeastOneDetoxMatcherWasCalled();
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

          atLeastOnePlaywrightMatcherWasCalled();
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

          atLeastOnePlaywrightMatcherWasCalled();
          noDetoxMatcherWasCalled();
        });
      }
    });
  });
}

export function describePageObjectMigration(
  pageObjectName: string,
  pageObject: object,
): void {
  const getterNames = getEncapsulatedGetterNames(pageObject);

  if (getterNames.length === 0) return;

  describeGetters(pageObjectName, pageObject, getterNames);
}

export function discoverAndDescribeMigratedPageObjects(
  pageObjectsDir: string,
): void {
  const files = findPageObjectsWithEncapsulated(pageObjectsDir);

  const path = jest.requireActual<typeof import('path')>('path');

  for (const filePath of files) {
    const mod = jest.requireActual<{ default?: object }>(filePath);
    const pageObject = mod.default;
    if (!pageObject || typeof pageObject !== 'object') continue;

    const name = path.basename(filePath, '.ts');
    describePageObjectMigration(name, pageObject);
  }
}
