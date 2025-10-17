import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReturnToAppNotification from './index.tsx';
import { ReturnToAppNotificationProps } from './ReturnToAppNotification.tsx';
import { ToastContext } from '../../../component-library/components/Toast/index.ts';

jest.mock('../../../../locales/i18n.js', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));

const mockSleep = jest.fn(() => Promise.resolve());
jest.mock('../../../util/testUtils/index.ts', () => ({
  sleep: (_: number) => mockSleep(),
}));

const mockUseFavicon = jest.fn();
jest.mock('../../hooks/useFavicon/index.ts', () => ({
  useFavicon: (...args: unknown[]) => mockUseFavicon(...args),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

describe('ReturnToAppNotification', () => {
  const createToastRef = () => ({
    current: { showToast: jest.fn(), closeToast: jest.fn() },
  });

  const renderWithProviders = (
    route: ReturnToAppNotificationProps['route'],
  ) => {
    const toastRef = createToastRef();

    const ui = (
      <SafeAreaProvider>
        <ToastContext.Provider value={{ toastRef }}>
          <ReturnToAppNotification route={route} />
        </ToastContext.Provider>
      </SafeAreaProvider>
    );

    const utils = render(ui);
    return { ...utils, toastRef };
  };

  const mockRoute: ReturnToAppNotificationProps['route'] = {
    params: {
      method: undefined,
      origin: 'https://example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
    mockUseFavicon.mockReturnValue({
      isLoaded: true,
      faviconURI: { uri: 'https://example.com/favicon.png' },
    });
  });

  it('renders without crashing', () => {
    renderWithProviders(mockRoute);
  });

  it('renders correctly with default message', () => {
    const { toJSON } = renderWithProviders(mockRoute);

    expect(toJSON()).toMatchSnapshot();
  });
});
