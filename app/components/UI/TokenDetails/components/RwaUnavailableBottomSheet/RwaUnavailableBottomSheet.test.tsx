import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import RwaUnavailableBottomSheet, {
  RwaUnavailableBottomSheetRef,
} from './RwaUnavailableBottomSheet';

const mockNavigate = jest.fn();
const runAfterInteractionsCallbacks: (() => void)[] = [];
const mockRunAfterInteractions = jest.spyOn(
  InteractionManager,
  'runAfterInteractions',
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock BottomSheet so onCloseBottomSheet immediately invokes its callback and onClose
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  let storedOnClose: (() => void) | undefined;

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose?: () => void },
        ref: React.Ref<unknown>,
      ) => {
        storedOnClose = onClose;
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: (cb?: () => void) => {
            cb?.();
            onClose?.();
          },
        }));
        return ReactActual.createElement(View, {}, children);
      },
    ),
    BottomSheetHeader: ({
      children,
      onClose: headerOnClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        {},
        ReactActual.createElement(RNText, {}, children),
      ),
    BottomSheetFooter: ({
      primaryButtonProps,
    }: {
      primaryButtonProps?: {
        children: string;
        onPress?: () => void;
      };
      style?: unknown;
    }) =>
      primaryButtonProps
        ? ReactActual.createElement(
            TouchableOpacity,
            { onPress: primaryButtonProps.onPress },
            ReactActual.createElement(RNText, {}, primaryButtonProps.children),
          )
        : null,
    Box: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, props, children),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, props, children),
    TextVariant: actual.TextVariant ?? {},
    BoxAlignItems: actual.BoxAlignItems ?? {},
    BoxJustifyContent: actual.BoxJustifyContent ?? {},
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    ({
      'rwa.unavailable.title': 'Unavailable in your region',
      'rwa.unavailable.description':
        "Tokenized stocks and ETFs aren't available in your region due to legal restrictions.",
      'rwa.unavailable.link': 'See Ondo eligibility requirements',
      'rwa.unavailable.button': 'Got it',
    })[key] ?? key,
}));

describe('RwaUnavailableBottomSheet', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runAfterInteractionsCallbacks.length = 0;
    mockRunAfterInteractions.mockImplementation((task) => {
      if (typeof task === 'function') {
        runAfterInteractionsCallbacks.push(task as () => void);
      }
      return {
        then: jest.fn(),
        done: jest.fn(),
        cancel: jest.fn(),
      } as ReturnType<typeof InteractionManager.runAfterInteractions>;
    });
  });

  afterAll(() => {
    mockRunAfterInteractions.mockRestore();
  });

  it('renders nothing before being opened', () => {
    const ref = React.createRef<RwaUnavailableBottomSheetRef>();
    render(<RwaUnavailableBottomSheet ref={ref} onDismiss={mockOnDismiss} />);

    expect(screen.queryByText('Unavailable in your region')).toBeNull();
  });

  it('displays content when opened via ref', () => {
    const ref = React.createRef<RwaUnavailableBottomSheetRef>();
    render(<RwaUnavailableBottomSheet ref={ref} onDismiss={mockOnDismiss} />);

    act(() => {
      ref.current?.onOpenBottomSheet();
    });

    expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
    expect(
      screen.getByText('See Ondo eligibility requirements'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Got it')).toBeOnTheScreen();
  });

  it('navigates to the Ondo eligibility webview when the link is pressed', () => {
    const ref = React.createRef<RwaUnavailableBottomSheetRef>();
    render(<RwaUnavailableBottomSheet ref={ref} onDismiss={mockOnDismiss} />);

    act(() => {
      ref.current?.onOpenBottomSheet();
    });

    fireEvent.press(
      screen.getByTestId('rwa-unavailable-ondo-eligibility-link'),
    );
    act(() => {
      runAfterInteractionsCallbacks.forEach((cb) => cb());
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Webview',
      expect.objectContaining({
        screen: 'SimpleWebview',
        params: expect.objectContaining({
          url: 'https://docs.ondo.finance/ondo-global-markets/eligibility',
        }),
      }),
    );
  });

  it('calls onDismiss when "Got it" is pressed', () => {
    const ref = React.createRef<RwaUnavailableBottomSheetRef>();
    render(<RwaUnavailableBottomSheet ref={ref} onDismiss={mockOnDismiss} />);

    act(() => {
      ref.current?.onOpenBottomSheet();
    });

    fireEvent.press(screen.getByText('Got it'));

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
