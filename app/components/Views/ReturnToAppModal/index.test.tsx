import { render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReturnToAppModal from '.';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));

describe('ReturnToAppModal', () => {
  const mockRoute = {
    params: {
      isPostNetworkSwitch: false,
    },
  };

  beforeEach(() => {
    mockRoute.params.isPostNetworkSwitch = false;
  });

  it('renders without crashing', () => {
    render(
      <SafeAreaProvider>
        <ReturnToAppModal route={mockRoute} />
      </SafeAreaProvider>,
    );
  });

  it('renders correctly iwth default message', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <ReturnToAppModal route={mockRoute} />
      </SafeAreaProvider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with specific post network switch message', () => {
    mockRoute.params.isPostNetworkSwitch = true;

    const { toJSON } = render(
      <SafeAreaProvider>
        <ReturnToAppModal route={mockRoute} />
      </SafeAreaProvider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
