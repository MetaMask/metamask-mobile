import React from 'react';
import { View as MockView } from 'react-native';
import Root from './';
import { render, waitFor } from '@testing-library/react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';

const MOCK_CHILD_ID = 'MOCK_CHILD_ID';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: jest
    .fn()
    .mockImplementation(() => <MockView testID={MOCK_CHILD_ID} />),
}));

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

describe('Root', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Root foxCode="" />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('should initialize SecureKeychain', async () => {
    render(<Root foxCode="" />);

    await waitFor(() => {
      expect(SecureKeychain.init).toHaveBeenCalled();
      expect(EntryScriptWeb3.init).toHaveBeenCalled();
    });
  });

  it('should render children if isTest OR isLoading is false', async () => {
    jest.isolateModules(() => {
      jest.mock('../../../util/test/utils', () => ({
        isTest: false,
      }));
      jest.mock('react', () => {
        const mockIsLoading = false;
        const mockSetIsLoading = jest.fn();
        return {
          ...jest.requireActual('react'),
          // Mock isLoading state to be false
          useState: jest
            .fn()
            .mockImplementation(() => [mockIsLoading, mockSetIsLoading]),
          useEffect: jest.fn(),
        };
      });
      // Import Root after mocking isTest
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const RootComponent = require('./index').default;

      const { getByTestId } = render(<RootComponent foxCode="" />);
      expect(getByTestId(MOCK_CHILD_ID)).toBeDefined();
    });
  });

  it('should render children if isTest AND isLoading is true', async () => {
    jest.isolateModules(() => {
      jest.mock('../../../util/test/utils', () => ({
        isTest: true,
      }));
      jest.mock('react', () => {
        const mockIsLoading = true;
        const mockSetIsLoading = jest.fn();
        return {
          ...jest.requireActual('react'),
          // Mock isLoading state to be true
          useState: jest
            .fn()
            .mockImplementation(() => [mockIsLoading, mockSetIsLoading]),
          useEffect: jest.fn(),
        };
      });
      // Import Root after mocking isTest
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const RootComponent = require('./index').default;

      const { toJSON } = render(<RootComponent foxCode="" />);
      expect(toJSON()).toBeNull();
    });
  });
});
