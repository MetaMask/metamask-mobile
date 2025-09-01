import React from 'react';
import { act } from '@testing-library/react-native';
import WebviewModal from './WebviewModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'WebviewModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

const mockWebViewProps = {
  onNavigationStateChange: jest.fn(),
  onHttpError: jest.fn(),
};

jest.mock('@metamask/react-native-webview', () => ({
  WebView: jest.fn(({ onNavigationStateChange, onHttpError }) => {
    mockWebViewProps.onNavigationStateChange = onNavigationStateChange;
    mockWebViewProps.onHttpError = onHttpError;
    return null;
  }),
}));

describe('WebviewModal Component', () => {
  const mockHandleNavigationStateChange = jest.fn();
  const mockSourceUrl = 'https://example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      sourceUrl: mockSourceUrl,
      handleNavigationStateChange: mockHandleNavigationStateChange,
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(WebviewModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display error view when webview HTTP error occurs', () => {
    const { toJSON } = renderWithProvider(WebviewModal);

    act(() => {
      mockWebViewProps.onHttpError({
        nativeEvent: {
          url: mockSourceUrl,
          statusCode: 404,
        },
      });
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('should call handleNavigationStateChange with correct parameters when WebView navigation state changes', () => {
    renderWithProvider(WebviewModal);

    const mockNavigationState = {
      url: 'https://example.com/new-page',
      title: 'New Page',
      loading: false,
      canGoBack: true,
      canGoForward: false,
    };

    act(() => {
      mockWebViewProps.onNavigationStateChange(mockNavigationState);
    });

    expect(mockHandleNavigationStateChange).toHaveBeenCalledWith(
      mockNavigationState,
    );
  });

  it('should deduplicate navigation state changes for the same URL', () => {
    renderWithProvider(WebviewModal);

    const mockNavigationState = {
      url: 'https://example.com/same-page',
      title: 'Same Page',
      loading: false,
      canGoBack: true,
      canGoForward: false,
    };

    act(() => {
      mockWebViewProps.onNavigationStateChange(mockNavigationState);
    });

    act(() => {
      mockWebViewProps.onNavigationStateChange(mockNavigationState);
    });

    expect(mockHandleNavigationStateChange).toHaveBeenCalledTimes(1);
    expect(mockHandleNavigationStateChange).toHaveBeenCalledWith(
      mockNavigationState,
    );

    // Call with a different URL
    const differentNavigationState = {
      ...mockNavigationState,
      url: 'https://example.com/different-page',
    };

    act(() => {
      mockWebViewProps.onNavigationStateChange(differentNavigationState);
    });

    expect(mockHandleNavigationStateChange).toHaveBeenCalledTimes(2);
    expect(mockHandleNavigationStateChange).toHaveBeenLastCalledWith(
      differentNavigationState,
    );
  });
});
