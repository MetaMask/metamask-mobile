import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserUrlBar from './BrowserUrlBar';
import { ConnectionType } from './BrowserUrlBar.types';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { backgroundState } from '../../../util/test/initial-root-state';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { fireEvent } from '@testing-library/react-native';
import { BrowserURLBarSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserURLBar.selectors';
import { AccountOverviewSelectorsIDs } from '../../../../e2e/selectors/Browser/AccountOverview.selectors';
import Routes from '../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const navigation = {
  params: {
    url: 'https://metamask.github.io/test-dapp/',
  },
};
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useRoute: jest.fn(() => ({ params: navigation.params })),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({
    build: jest.fn(),
  })),
}));

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (callback: unknown) => mockUseSelector(callback),
}));

describe('BrowserUrlBar', () => {
  const defaultProps = {
    connectionType: ConnectionType.SECURE,
    onSubmitEditing: jest.fn(),
    onCancel: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    onChangeText: jest.fn(),
    connectedAccounts: ['0x123'],
    activeUrl: 'https://example.com',
    setIsUrlBarFocused: jest.fn(),
    isUrlBarFocused: true,
  };
  const propsWithoutUrlBarFocused = {
    connectionType: ConnectionType.SECURE,
    onSubmitEditing: jest.fn(),
    onCancel: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    onChangeText: jest.fn(),
    connectedAccounts: ['0x123'],
    activeUrl: 'https://example.com',
    setIsUrlBarFocused: jest.fn(),
    isUrlBarFocused: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAccountsLength) return 1;
      if (selector === selectNetworkConfigurations) return {};
      if (selector === selectProviderConfig) return { chainId: '0x1' };
      return null;
    });
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<BrowserUrlBar {...defaultProps} />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when url bar is not focused', () => {
    const { toJSON } = renderWithProvider(
      <BrowserUrlBar {...propsWithoutUrlBarFocused} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle text input changes', () => {
    const { getByTestId } = renderWithProvider(
      <BrowserUrlBar {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    const urlInput = getByTestId(BrowserURLBarSelectorsIDs.URL_INPUT);
    fireEvent.changeText(urlInput, 'test.com');

    expect(defaultProps.onChangeText).toHaveBeenCalledWith('test.com');
  });

  it('should handle submit editing', () => {
    const { getByTestId } = renderWithProvider(
      <BrowserUrlBar {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    const urlInput = getByTestId(BrowserURLBarSelectorsIDs.URL_INPUT);
    fireEvent(urlInput, 'submitEditing', {
      nativeEvent: { text: '  test.com  ' },
    });

    expect(defaultProps.onSubmitEditing).toHaveBeenCalledWith('test.com');
  });

  it('should handle clear input button press', () => {
    const { getByTestId } = renderWithProvider(
      <BrowserUrlBar {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    const clearButton = getByTestId(BrowserURLBarSelectorsIDs.URL_CLEAR_ICON);
    fireEvent.press(clearButton);

    expect(defaultProps.onChangeText).toHaveBeenCalledWith('');
  });

  it('should handle cancel button press', () => {
    const { getByTestId } = renderWithProvider(
      <BrowserUrlBar {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    const cancelButton = getByTestId(
      BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID,
    );
    fireEvent.press(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
    expect(defaultProps.setIsUrlBarFocused).toHaveBeenCalledWith(false);
  });

  it('should handle account right button press', () => {
    const { getByTestId } = renderWithProvider(
      <BrowserUrlBar {...propsWithoutUrlBarFocused} />,
      { state: mockInitialState },
    );

    const accountButton = getByTestId(
      AccountOverviewSelectorsIDs.ACCOUNT_BUTTON,
    );
    fireEvent.press(accountButton);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_PERMISSIONS,
      params: {
        hostInfo: {
          metadata: {
            origin: 'example.com',
          },
        },
      },
    });
  });

  it('should handle focus and blur events', () => {
    const { getByTestId } = renderWithProvider(
      <BrowserUrlBar {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    const urlInput = getByTestId(BrowserURLBarSelectorsIDs.URL_INPUT);

    fireEvent(urlInput, 'focus');
    expect(defaultProps.setIsUrlBarFocused).toHaveBeenCalledWith(true);
    expect(defaultProps.onFocus).toHaveBeenCalled();

    fireEvent(urlInput, 'blur');
    expect(defaultProps.setIsUrlBarFocused).toHaveBeenCalledWith(false);
    expect(defaultProps.onBlur).toHaveBeenCalled();
  });
});
