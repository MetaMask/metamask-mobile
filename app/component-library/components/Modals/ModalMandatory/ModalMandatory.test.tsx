import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WebView } from '@metamask/react-native-webview';
import ModalMandatory from './ModalMandatory';
import { TermsOfUseModalSelectorsIDs } from '../../../../util/termsOfUse/TermsOfUseModal.testIds';
import { BodyWebViewUri } from './ModalMandatory.types';
import { Text } from 'react-native';
import styleSheet from './ModalMandatory.styles';
import { mockTheme } from '../../../../util/theme';
import { useNavigation } from '@react-navigation/native';

// Mock the WebView component
jest.mock('@metamask/react-native-webview', () => ({
  WebView: jest.fn(({ onLoad, onMessage, onScroll }) => (
    <div
      data-testid={'terms-of-use-webview-id'}
      onClick={() => {
        onLoad?.();
        onMessage?.({ nativeEvent: { data: 'WEBVIEW_SCROLL_END_EVENT' } });
        onScroll?.({
          nativeEvent: {
            layoutMeasurement: { height: 100 },
            contentOffset: { y: 100 },
            contentSize: { height: 200 },
          },
        });
      }}
    />
  )),
}));

// Mock the BottomSheet component
jest.mock('../../BottomSheets/BottomSheet', () => ({
  __esModule: true,
  default: jest.fn(({ children }) => (
    <div data-testid="mock-bottom-sheet">{children}</div>
  )),
}));

const mockOnAccept = jest.fn();
const mockOnRender = jest.fn();

const defaultParams = {
  headerTitle: 'Test Title',
  footerHelpText: 'Test Footer',
  buttonText: 'Accept',
  body: {
    source: 'WebView' as const,
    uri: 'https://test.com',
  } as BodyWebViewUri,
  onAccept: mockOnAccept,
  checkboxText: 'I agree',
  onRender: mockOnRender,
  isScrollToEndNeeded: true,
  scrollEndBottomMargin: 20,
  containerTestId: 'test-container',
  buttonTestId: 'test-button',
};

let mockRouteParams: Record<string, unknown> = { ...defaultParams };

// Mock useNavigation and useRoute
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: () => ({
    key: '1',
    name: 'params',
    params: mockRouteParams,
  }),
}));

describe('ModalMandatory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRender.mockReset();
    mockRouteParams = {
      ...defaultParams,
      onRender: mockOnRender,
      onAccept: mockOnAccept,
    };
  });

  it('renders correctly with all props', () => {
    const { getByText, toJSON } = render(<ModalMandatory />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Footer')).toBeTruthy();
    expect(getByText('Accept')).toBeTruthy();
    expect(getByText('I agree')).toBeTruthy();

    expect(toJSON).toMatchSnapshot();
  });

  it('handles scroll events correctly', () => {
    const { getByTestId } = render(<ModalMandatory />);
    const webview = getByTestId(TermsOfUseModalSelectorsIDs.WEBVIEW);

    fireEvent.press(webview);
    expect(WebView).toHaveBeenCalledWith(
      expect.objectContaining({
        onMessage: expect.any(Function),
        onScroll: expect.any(Function),
      }),
      expect.any(Object),
    );
  });

  it('handles checkbox selection', () => {
    const { getByTestId } = render(<ModalMandatory />);
    const checkbox = getByTestId(TermsOfUseModalSelectorsIDs.CHECKBOX);

    fireEvent.press(checkbox);
    expect(checkbox).toBeTruthy();
  });

  it('disables button when conditions are not met', () => {
    const { getByTestId } = render(<ModalMandatory />);
    const button = getByTestId('test-button');

    expect(button.props.disabled).toBe(true);
  });

  it('enables button when conditions are met', async () => {
    mockRouteParams = { ...mockRouteParams, isScrollToEndNeeded: false };

    const { getByTestId } = render(<ModalMandatory />);
    const checkbox = getByTestId(TermsOfUseModalSelectorsIDs.CHECKBOX);
    const button = getByTestId('test-button');

    // Initially disabled
    expect(button.props.disabled).toBe(true);

    // Select checkbox
    fireEvent.press(checkbox);

    // Should be enabled after checkbox selection
    expect(button.props.disabled).toBe(false);
  });

  it('calls onAccept when button is pressed', async () => {
    // Mock the navigation object
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);

    mockRouteParams = { ...mockRouteParams, isScrollToEndNeeded: false };

    const { getByTestId } = render(<ModalMandatory />);
    const checkbox = getByTestId(TermsOfUseModalSelectorsIDs.CHECKBOX);
    const button = getByTestId('test-button');

    // Select checkbox
    fireEvent.press(checkbox);

    // Press button
    fireEvent.press(button);
    expect(mockOnAccept).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders scroll to end button when needed', () => {
    const { getByTestId } = render(<ModalMandatory />);
    const scrollButton = getByTestId(
      TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
    );

    expect(scrollButton).toBeTruthy();
  });

  it('handles Node source type correctly', () => {
    mockRouteParams = {
      ...mockRouteParams,
      body: {
        source: 'Node' as const,
        component: () => <Text>Test Node Content</Text>,
      },
    };

    const { getByText } = render(<ModalMandatory />);
    expect(getByText('Test Node Content')).toBeTruthy();
  });

  it('calls onRender when component mounts', () => {
    render(<ModalMandatory />);
    expect(mockOnRender).toHaveBeenCalled();
  });

  it('does not render scroll to end button when not needed', () => {
    mockRouteParams = { ...mockRouteParams, isScrollToEndNeeded: false };

    const { queryByTestId } = render(<ModalMandatory />);
    expect(
      queryByTestId(TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON),
    ).toBeNull();
  });

  it('handles WebView with HTML content', () => {
    mockRouteParams = {
      ...mockRouteParams,
      body: {
        source: 'WebView' as const,
        html: '<div>Test HTML Content</div>',
      },
    };

    const { getByTestId } = render(<ModalMandatory />);
    expect(getByTestId(TermsOfUseModalSelectorsIDs.WEBVIEW)).toBeTruthy();
  });

  describe('styleSheet', () => {
    it('creates styles with theme colors', () => {
      const styles = styleSheet({ theme: mockTheme });

      expect(styles).toBeDefined();
      expect(styles.screen).toBeDefined();
      expect(styles.modal).toBeDefined();
      expect(styles.modal.backgroundColor).toBe(
        mockTheme.colors.background.default,
      );
    });
  });
});
