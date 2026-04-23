import React from 'react';
import ModalMandatory from './ModalMandatory';
import { TermsOfUseModalSelectorsIDs } from '../../../../util/termsOfUse/TermsOfUseModal.testIds';
import { BodyWebViewUri } from './ModalMandatory.types';
import { Text } from 'react-native';
import styleSheet from './ModalMandatory.styles';
import { mockTheme } from '../../../../util/theme';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockedNavigate,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all props', () => {
    const { getByText, toJSON } = render(<ModalMandatory route={mockRoute} />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Footer')).toBeTruthy();
    expect(getByText('Accept')).toBeTruthy();
    expect(getByText('I agree')).toBeTruthy();

    expect(toJSON).toBeDefined();
  });
  it('should render correctly component mandatory modal', () => {
    const { toJSON } = renderWithProvider(
      <ModalMandatory
        route={{
          params: {
            headerTitle: 'test',
            footerHelpText: 'test',
            buttonText: 'test',
            body: { source: 'Node', component: () => <></> },
            onAccept: () => null,
            checkboxText: 'test',
          },
        }}
      />,
    );
  });

  it('handles checkbox selection', () => {
    const { getByTestId } = render(<ModalMandatory route={mockRoute} />);
    const checkbox = getByTestId(TermsOfUseModalSelectorsIDs.CHECKBOX);

    fireEvent.press(checkbox);
    expect(checkbox).toBeTruthy();
  });

  it('disables button when conditions are not met', () => {
    const { getByTestId } = render(<ModalMandatory route={mockRoute} />);
    const button = getByTestId('test-button');

    expect(button.props.disabled).toBe(true);
  });

  it('enables button when conditions are met', async () => {
    const routeWithoutScroll = {
      ...mockRoute,
      params: {
        ...mockRoute.params,
        isScrollToEndNeeded: false,
      },
    };

    const { getByTestId } = render(
      <ModalMandatory route={routeWithoutScroll} />,
    );
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

    const routeWithoutScroll = {
      ...mockRoute,
      params: {
        ...mockRoute.params,
        isScrollToEndNeeded: false,
      },
    };

    const { getByTestId } = render(
      <ModalMandatory route={routeWithoutScroll} />,
    );
    const checkbox = getByTestId(TermsOfUseModalSelectorsIDs.CHECKBOX);
    const button = getByTestId('test-button');

    // Select checkbox
    fireEvent.press(checkbox);

    // Press button
    fireEvent.press(button);
    expect(mockRoute.params.onAccept).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders scroll to end button when needed', () => {
    const { getByTestId } = render(<ModalMandatory route={mockRoute} />);
    const scrollButton = getByTestId(
      TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
    );

    expect(scrollButton).toBeTruthy();
  });

  it('handles Node source type correctly', () => {
    const nodeRoute = {
      ...mockRoute,
      params: {
        ...mockRoute.params,
        body: {
          source: 'Node' as const,
          component: () => <Text>Test Node Content</Text>,
        },
      },
    };

    const { getByText } = render(<ModalMandatory route={nodeRoute} />);
    expect(getByText('Test Node Content')).toBeTruthy();
  });

  it('calls onRender when component mounts', () => {
    render(<ModalMandatory route={mockRoute} />);
    expect(mockRoute.params.onRender).toHaveBeenCalled();
  });

  it('does not render scroll to end button when not needed', () => {
    const routeWithoutScroll = {
      ...mockRoute,
      params: {
        ...mockRoute.params,
        isScrollToEndNeeded: false,
      },
    };

    const { queryByTestId } = render(
      <ModalMandatory route={routeWithoutScroll} />,
    );
    expect(
      queryByTestId(TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON),
    ).toBeNull();
  });

  it('handles WebView with HTML content', () => {
    const htmlRoute = {
      ...mockRoute,
      params: {
        ...mockRoute.params,
        body: {
          source: 'WebView' as const,
          html: '<div>Test HTML Content</div>',
        },
      },
    };

    const { getByTestId } = render(<ModalMandatory route={htmlRoute} />);
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
