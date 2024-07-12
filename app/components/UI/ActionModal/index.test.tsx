import React from 'react';
import { render } from '@testing-library/react-native';
import ActionModal from './';
import { ThemeContext } from '../../../util/theme';

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    DeviceEventEmitter: {
      addListener: jest.fn(),
      removeListener: jest.fn(), // Jest mock function for removeListener
    },
    Linking: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});

jest.mock('react-native-modal', () => {
  const { View } = jest.requireActual('react-native');
  const MockModal = (props: React.ComponentProps<typeof View>) => (
    <View {...props} />
  );
  MockModal.displayName = 'MockModal';
  return MockModal;
});

jest.mock('../../../util/theme', () => {
  const actualTheme = jest.requireActual('../../../util/theme');
  return {
    ...actualTheme,
    ThemeContext: React.createContext({
      colors: { primary: '#000' },
    }),
  };
});

describe('ActionModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={{ colors: { primary: '#000' } }}>
        <ActionModal />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
