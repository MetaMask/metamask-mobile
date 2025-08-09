import React, { createRef } from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserUrlBar from './BrowserUrlBar';
import { ConnectionType, BrowserUrlBarRef } from './BrowserUrlBar.types';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { backgroundState } from '../../../util/test/initial-root-state';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { fireEvent, act } from '@testing-library/react-native';
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

  describe('useImperativeHandle methods', () => {
    let urlBarRef: React.RefObject<BrowserUrlBarRef>;

    beforeEach(() => {
      // Arrange - Create ref for each test
      urlBarRef = createRef<BrowserUrlBarRef>();
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

    describe('hide method', () => {
      it('calls onCancel prop when hide is invoked', () => {
        // Arrange
        const onCancelMock = jest.fn();
        const props = { ...defaultProps, onCancel: onCancelMock };

        renderWithProvider(<BrowserUrlBar {...props} ref={urlBarRef} />, {
          state: mockInitialState,
        });

        // Act
        urlBarRef.current?.hide();

        // Assert
        expect(onCancelMock).toHaveBeenCalledTimes(1);
      });

      it('sets URL bar focused state to false when hide is invoked', () => {
        // Arrange
        const setIsUrlBarFocusedMock = jest.fn();
        const props = {
          ...defaultProps,
          setIsUrlBarFocused: setIsUrlBarFocusedMock,
          isUrlBarFocused: true,
        };

        renderWithProvider(<BrowserUrlBar {...props} ref={urlBarRef} />, {
          state: mockInitialState,
        });

        // Act
        urlBarRef.current?.hide();

        // Assert
        expect(setIsUrlBarFocusedMock).toHaveBeenCalledWith(false);
      });
    });

    describe('focus method', () => {
      it('makes focus method available through imperative handle', () => {
        // Arrange
        renderWithProvider(
          <BrowserUrlBar {...defaultProps} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Act & Assert - Should not throw errors and should be callable
        expect(() => urlBarRef.current?.focus()).not.toThrow();
        expect(typeof urlBarRef.current?.focus).toBe('function');
      });
    });

    describe('blur method', () => {
      it('makes blur method available through imperative handle', () => {
        // Arrange
        renderWithProvider(
          <BrowserUrlBar {...defaultProps} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Act & Assert - Should not throw errors and should be callable
        expect(() => urlBarRef.current?.blur()).not.toThrow();
        expect(typeof urlBarRef.current?.blur).toBe('function');
      });
    });

    describe('setNativeProps method', () => {
      it('updates displayed URL text when setNativeProps is called with valid text', () => {
        // Arrange
        const { getByText } = renderWithProvider(
          <BrowserUrlBar {...propsWithoutUrlBarFocused} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Initially shows the activeUrl hostname
        expect(getByText('example.com')).toBeOnTheScreen();

        // Act
        act(() => {
          urlBarRef.current?.setNativeProps({ text: 'newsite.com' });
        });

        // Assert
        expect(getByText('newsite.com')).toBeOnTheScreen();
      });

      it('makes setNativeProps method available through imperative handle', () => {
        // Arrange
        renderWithProvider(
          <BrowserUrlBar {...defaultProps} ref={urlBarRef} />,
          { state: mockInitialState },
        );
        const testProps = { text: 'test.com', placeholder: 'test placeholder' };

        // Act & Assert - Should not throw errors and should be callable
        expect(() => {
          act(() => {
            urlBarRef.current?.setNativeProps(testProps);
          });
        }).not.toThrow();
        expect(typeof urlBarRef.current?.setNativeProps).toBe('function');
      });

      it('ignores non-string text values when updating displayed URL', () => {
        // Arrange
        const { getByText } = renderWithProvider(
          <BrowserUrlBar {...propsWithoutUrlBarFocused} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Initially shows the activeUrl hostname
        expect(getByText('example.com')).toBeOnTheScreen();

        // Act - Pass non-string text
        act(() => {
          urlBarRef.current?.setNativeProps({ text: 123 as number });
        });

        // Assert - Should still show original text
        expect(getByText('example.com')).toBeOnTheScreen();
      });

      it('preserves displayed URL when setNativeProps is called without text property', () => {
        // Arrange
        const { getByText } = renderWithProvider(
          <BrowserUrlBar {...propsWithoutUrlBarFocused} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Initially shows the activeUrl hostname
        expect(getByText('example.com')).toBeOnTheScreen();

        // Act - Call without text property
        act(() => {
          urlBarRef.current?.setNativeProps({ placeholder: 'test' });
        });

        // Assert - Should still show original text
        expect(getByText('example.com')).toBeOnTheScreen();
      });
    });

    describe('ref interface completeness', () => {
      it('exposes all required imperative methods when ref is attached', () => {
        // Arrange & Act
        renderWithProvider(
          <BrowserUrlBar {...defaultProps} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Assert
        expect(urlBarRef.current).toBeTruthy();
        expect(typeof urlBarRef.current?.hide).toBe('function');
        expect(typeof urlBarRef.current?.focus).toBe('function');
        expect(typeof urlBarRef.current?.blur).toBe('function');
        expect(typeof urlBarRef.current?.setNativeProps).toBe('function');
      });

      it('handles method calls gracefully when TextInput ref is unavailable', () => {
        // Arrange
        renderWithProvider(
          <BrowserUrlBar {...defaultProps} ref={urlBarRef} />,
          { state: mockInitialState },
        );

        // Act & Assert - Should not throw errors
        expect(() => {
          urlBarRef.current?.focus();
          urlBarRef.current?.blur();
          act(() => {
            urlBarRef.current?.setNativeProps({ text: 'test' });
          });
          urlBarRef.current?.hide();
        }).not.toThrow();
      });
    });
  });
});
