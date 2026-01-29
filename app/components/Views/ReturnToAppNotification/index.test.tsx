import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReturnToAppNotification from './index.tsx';
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
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
    useRoute: () => mockUseRoute(),
  };
});

describe('ReturnToAppNotification', () => {
  const createToastRef = () => ({
    current: { showToast: jest.fn(), closeToast: jest.fn() },
  });

  const renderWithProviders = () => {
    const toastRef = createToastRef();

    const ui = (
      <SafeAreaProvider>
        <ToastContext.Provider value={{ toastRef }}>
          <ReturnToAppNotification />
        </ToastContext.Provider>
      </SafeAreaProvider>
    );

    const utils = render(ui);
    return { ...utils, toastRef };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
    mockUseFavicon.mockReturnValue({
      isLoaded: true,
      faviconURI: { uri: 'https://example.com/favicon.png' },
    });
    mockUseRoute.mockReturnValue({
      params: {
        method: undefined,
        origin: 'https://example.com',
      },
    });
  });

  it('renders without crashing', () => {
    renderWithProviders();
  });

  it('renders correctly with default message', () => {
    const { toJSON } = renderWithProviders();

    expect(toJSON()).toMatchSnapshot();
  });
});
