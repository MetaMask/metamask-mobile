/* eslint-env jest */
import Utilities from './utils/Utilities';

const originalIt = global.it;

/**
 * We're using the currentTestNameRef to store the current test name that can be
 * read from anywhere. This is used to ensure that the port is unique for each test.
 */
const currentTestNameRef = { value: undefined };
global.getCurrentTestName = () => currentTestNameRef.value;

/**
 * @description
 * We're wrapping the test function to store the current test name in the currentTestNameRef.
 */
function wrapTestFn(testName, testFn) {
  // Support sync, promise, or async test functions without relying on `this`
  return async () => {
    currentTestNameRef.value = testName;
    try {
      return await testFn();
    } finally {
      currentTestNameRef.value = undefined;
    }
  };
}

/**
 * @description
 * We're patching the it function to store the current test name in the currentTestNameRef.
 */
function patchedIt(testName, testFn, timeout) {
  return originalIt(testName, wrapTestFn(testName, testFn), timeout);
}

/**
 * @description
 * We're preserving the Jest helpers (.only/.skip/.each)
 */
Object.defineProperties(patchedIt, {
  only: {
    value: (name, fn, timeout) =>
      originalIt.only(name, wrapTestFn(name, fn), timeout),
  },
  skip: {
    value: (name, fn, timeout) =>
      originalIt.skip(name, wrapTestFn(name, fn), timeout),
  },
  each: {
    value:
      (...eachArgs) =>
      (name, fn, timeout) =>
        originalIt.each(...eachArgs)(name, wrapTestFn(name, fn), timeout),
  },
});
global.it = patchedIt;

/**
 * Before all tests, modify the app launch arguments to include the blacklistURLs.
 * This sets up the environment for Detox tests.
 */
beforeAll(async () => {
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: Utilities.BlacklistURLs,
    permissions: { notifications: 'YES' },
  });
});
