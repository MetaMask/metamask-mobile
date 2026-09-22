import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler, Pressable, StyleSheet, Text } from 'react-native';
import PerpsTradeBottomSheet, {
  PerpsTradeSheetTitleBanner,
  type PerpsTradeSheetScreen,
  usePerpsTradeSheet,
} from './PerpsTradeBottomSheet';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

let openCallback: (() => void) | undefined;
let hardwareBackHandler: (() => boolean | null | undefined) | undefined;
const mockCloseBottomSheet = jest.fn();
let mockDeferSheetClose = false;
const tradeSheetConfig = {
  rootScreen: 'trade' as const,
  screenDepth: {
    trade: 0,
    leverage: 1,
    tpsl: 1,
    settings: 1,
  },
};

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactMock = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactMock.forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose: () => void },
        ref: React.Ref<unknown>,
      ) => {
        ReactMock.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (callback: () => void) => {
            openCallback = callback;
          },
          onCloseBottomSheet: (callback?: () => void) => {
            mockCloseBottomSheet();
            if (!mockDeferSheetClose) {
              onClose();
            }
            callback?.();
          },
        }));
        return ReactMock.createElement(
          MockView,
          { testID: 'trade-sheet', onTouchEnd: onClose },
          children,
        );
      },
    ),
  };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  const { View: MockView } = jest.requireActual('react-native');
  return {
    ...actual,
    __esModule: true,
    default: { ...actual.default, View: MockView },
  };
});

const TradeTestScreen = () => {
  const { navigateTo } = usePerpsTradeSheet();
  return (
    <Pressable testID="open-leverage" onPress={() => navigateTo('leverage')}>
      <Text>Trade</Text>
    </Pressable>
  );
};

const LeverageTestScreen = () => {
  const { goBack } = usePerpsTradeSheet();
  return (
    <Pressable testID="back-to-trade" onPress={goBack}>
      <Text>Leverage</Text>
    </Pressable>
  );
};

const CloseTestScreen = () => {
  const { close } = usePerpsTradeSheet();
  return (
    <Pressable testID="close-trade" onPress={close}>
      <Text>Trade</Text>
    </Pressable>
  );
};

const TitleBannerScreen = () => {
  const { title, banner } = usePerpsTradeSheet();
  return <PerpsTradeSheetTitleBanner title={title} banner={banner} />;
};

type CustomTestScreen = 'root' | 'details';

const CustomRootScreen = () => {
  const { navigateTo } = usePerpsTradeSheet<CustomTestScreen>();
  return (
    <Pressable testID="open-details" onPress={() => navigateTo('details')}>
      <Text>Custom root</Text>
    </Pressable>
  );
};

describe('PerpsTradeBottomSheet', () => {
  beforeEach(() => {
    openCallback = undefined;
    hardwareBackHandler = undefined;
    mockCloseBottomSheet.mockClear();
    mockDeferSheetClose = false;
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event, handler) => {
        hardwareBackHandler = handler;
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates forward to a nested screen and back to Trade', () => {
    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        {...tradeSheetConfig}
        screens={{
          trade: <TradeTestScreen />,
          leverage: <LeverageTestScreen />,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());
    expect(screen.getByText('Trade')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('open-leverage'));
    expect(screen.getByText('Leverage')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('back-to-trade'));
    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('returns to Trade when Android back is pressed on a nested screen', () => {
    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        {...tradeSheetConfig}
        screens={{
          trade: <TradeTestScreen />,
          leverage: <LeverageTestScreen />,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());
    fireEvent.press(screen.getByTestId('open-leverage'));
    act(() => {
      expect(hardwareBackHandler?.()).toBe(true);
    });

    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('locks nested screens to the measured Trade screen height', () => {
    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        {...tradeSheetConfig}
        screens={{
          trade: <TradeTestScreen />,
          leverage: <LeverageTestScreen />,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());
    fireEvent(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.CONTENT),
      'layout',
      { nativeEvent: { layout: { height: 480 } } },
    );
    fireEvent.press(screen.getByTestId('open-leverage'));

    expect(
      StyleSheet.flatten(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.CONTENT).props.style,
      ),
    ).toMatchObject({ height: expect.any(Number) });
  });

  it('closes the dialog through the nested screen API', () => {
    const onClose = jest.fn();
    const onCancelBeforeInteractive = jest.fn();

    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={onClose}
        onCancelBeforeInteractive={onCancelBeforeInteractive}
        {...tradeSheetConfig}
        screens={{
          trade: <CloseTestScreen />,
          leverage: null,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());
    fireEvent.press(screen.getByTestId('close-trade'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelBeforeInteractive).toHaveBeenCalledTimes(1);
  });

  it('starts the close animation only once for synchronous close requests', () => {
    mockDeferSheetClose = true;

    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        {...tradeSheetConfig}
        screens={{
          trade: <CloseTestScreen />,
          leverage: null,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());
    const closeButton = screen.getByTestId('close-trade');
    fireEvent.press(closeButton);
    fireEvent.press(closeButton);

    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('reports the root screen interactive once after layout', () => {
    const onInteractive = jest.fn();

    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        onInteractive={onInteractive}
        {...tradeSheetConfig}
        screens={{
          trade: <TradeTestScreen />,
          leverage: null,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    fireEvent(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.CONTENT),
      'layout',
      { nativeEvent: { layout: { height: 480 } } },
    );
    fireEvent(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.CONTENT),
      'layout',
      { nativeEvent: { layout: { height: 480 } } },
    );

    expect(onInteractive).toHaveBeenCalledTimes(1);
  });

  it('does not render a title or banner when the parent omits them', () => {
    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        {...tradeSheetConfig}
        screens={{
          trade: <TradeTestScreen />,
          leverage: null,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());

    expect(screen.queryByText('Close position')).toBeNull();
    expect(screen.queryByText('Risk warning')).toBeNull();
  });

  it('renders an optional title with the banner directly below it', () => {
    render(
      <PerpsTradeBottomSheet<PerpsTradeSheetScreen>
        onClose={jest.fn()}
        {...tradeSheetConfig}
        title="Close position"
        banner={<Text>Risk warning</Text>}
        screens={{
          trade: <TitleBannerScreen />,
          leverage: null,
          tpsl: null,
          settings: null,
        }}
      />,
    );

    act(() => openCallback?.());

    const [title, banner] = screen.getAllByText(/Close position|Risk warning/);
    expect(title).toHaveTextContent('Close position');
    expect(banner).toHaveTextContent('Risk warning');
  });

  it('supports caller-defined screen keys and navigation depth', () => {
    render(
      <PerpsTradeBottomSheet<CustomTestScreen>
        onClose={jest.fn()}
        rootScreen="root"
        screenDepth={{ root: 0, details: 1 }}
        screens={{
          root: <CustomRootScreen />,
          details: <Text>Custom details</Text>,
        }}
      />,
    );

    act(() => openCallback?.());
    fireEvent.press(screen.getByTestId('open-details'));

    expect(screen.getByText('Custom details')).toBeOnTheScreen();
  });
});
