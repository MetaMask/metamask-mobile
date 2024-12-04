import { render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReturnToAppModal from '.';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));

describe('ReturnToAppModal', () => {
  it('renders without crashing', () => {
    render(
      <SafeAreaProvider>
        <ReturnToAppModal />
      </SafeAreaProvider>,
    );
  });

  it('renders correctly', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <ReturnToAppModal />
      </SafeAreaProvider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
