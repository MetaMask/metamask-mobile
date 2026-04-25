import React from 'react';
import Root from './';
import { render, waitFor } from '@testing-library/react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
// Namespace import allows tests to override `isTest` on the mocked module via defineProperty.
// eslint-disable-next-line import-x/no-namespace -- see jest.mock('../../../util/test/utils') below
import * as testUtils from '../../../util/test/utils';

jest.mock('../../../core/SecureKeychain', () => ({
  ...jest.requireActual('../../../core/SecureKeychain').default,
  init: jest.fn(),
}));

jest.mock('../../../core/EntryScriptWeb3', () => ({
  init: jest.fn(),
}));

jest.mock('../../../core/OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('../../Nav/App', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => View({ testID: 'mock-app' }),
  };
});

jest.mock('../../Nav/ControllersGate', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('../../../util/test/utils', () => ({
  ...jest.requireActual('../../../util/test/utils'),
  isTest: true,
}));

describe('Root', () => {
  it('should initialize SecureKeychain', async () => {
    render(<Root foxCode="" />);

    await waitFor(() => {
      expect(SecureKeychain.init).toHaveBeenCalled();
      expect(EntryScriptWeb3.init).toHaveBeenCalled();
    });
  });

  it('should render children if isTest is false (skips store wait)', () => {
    Object.defineProperty(testUtils, 'isTest', {
      value: false,
      writable: true,
    });
    const { toJSON } = render(<Root foxCode="" />);
    expect(toJSON()).toBeDefined();
    Object.defineProperty(testUtils, 'isTest', { value: true, writable: true });
  });

  it('should render null while isTest is true and store is loading', () => {
    Object.defineProperty(testUtils, 'isTest', { value: true, writable: true });
    const { toJSON } = render(<Root foxCode="" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
