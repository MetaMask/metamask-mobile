import React from 'react';
import { render } from '@testing-library/react-native';
import Checkout from './Checkout';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

jest.mock('../../../Navbar', () => ({
  getRampsNavbarOptions: jest.fn(
    (_navigation: unknown, _options: unknown) => ({}),
  ),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    url: 'https://provider.example.com/widget?test=1',
    providerName: 'Test Provider',
  })),
}));

jest.mock('../../../../../util/browser', () => ({
  shouldStartLoadWithRequest: jest.fn(() => true),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual('react');
    return {
      __esModule: true,
      default: mockReact.forwardRef(
        (
          {
            children,
          }: {
            children: React.ReactNode;
          },
          ref: React.Ref<unknown>,
        ) => {
          mockReact.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return <>{children}</>;
        },
      ),
    };
  },
);

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with valid URL', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders WebView when URL is provided', () => {
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    expect(getByTestId('checkout-webview')).toBeOnTheScreen();
  });

  it('renders close button', () => {
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    expect(getByTestId('checkout-close-button')).toBeOnTheScreen();
  });
});
