import { EncapsulatedElement } from './EncapsulatedElement';
import Matchers from './Matchers';
import PlaywrightMatchers from './PlaywrightMatchers';
import { resetDeviceInfo, setDeviceInfo } from './DeviceInfoCache.ts';

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
  return names;
}

function atLeastOnePlaywrightMatcherWasCalled(): void {
  const playwrightCallCount =
    (PlaywrightMatchers.getElementById as jest.Mock).mock.calls.length +
    (PlaywrightMatchers.getElementByText as jest.Mock).mock.calls.length +
    (PlaywrightMatchers.getElementByAccessibilityId as jest.Mock).mock.calls
      .length +
    (PlaywrightMatchers.getElementByCatchAll as jest.Mock).mock.calls.length +
    (PlaywrightMatchers.getElementByXPath as jest.Mock).mock.calls.length;
  expect(playwrightCallCount).toBeGreaterThan(0);
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
    describe('Appium context — iOS', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        resetDeviceInfo();
        setDeviceInfo('ios', { width: 390, height: 844 });
      });

      afterEach(() => {
        resetDeviceInfo();
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
        jest.clearAllMocks();
        resetDeviceInfo();
        setDeviceInfo('android', { width: 400, height: 800 });
      });

      afterEach(() => {
        resetDeviceInfo();
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

  if (files.length === 0) {
    it('has no remaining page objects that call encapsulated()', () => {
      expect(files).toEqual([]);
    });
    return;
  }

  const path = jest.requireActual<typeof import('path')>('path');

  for (const filePath of files) {
    const mod = jest.requireActual<{ default?: object }>(filePath);
    const pageObject = mod.default;
    if (!pageObject || typeof pageObject !== 'object') continue;

    const name = path.basename(filePath, '.ts');
    describePageObjectMigration(name, pageObject);
  }
}
