import { NativeModules, Platform } from 'react-native';
import { getHermesProfilerModule } from './hermesProfilerModule';

describe('hermesProfilerModule', () => {
  const originalModule = NativeModules.MetaMaskHermesProfiler;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = 'ios';
    if (originalModule === undefined) {
      delete NativeModules.MetaMaskHermesProfiler;
    } else {
      NativeModules.MetaMaskHermesProfiler = originalModule;
    }
  });

  it('returns null on iOS even when a native module is present', () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'ios';
    NativeModules.MetaMaskHermesProfiler = {
      startProfiling: jest.fn(),
      stopProfilingToAppStorage: jest.fn(),
    };

    expect(getHermesProfilerModule()).toBeNull();
  });

  it('returns null on Android when MetaMaskHermesProfiler is not registered', () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'android';
    delete NativeModules.MetaMaskHermesProfiler;

    expect(getHermesProfilerModule()).toBeNull();
  });

  it('returns the native module on Android when it is registered', () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'android';
    const nativeModule = {
      startProfiling: jest.fn(),
      stopProfilingToAppStorage: jest.fn(),
    };
    NativeModules.MetaMaskHermesProfiler = nativeModule;

    expect(getHermesProfilerModule()).toBe(nativeModule);
  });
});
