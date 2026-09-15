import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import PerpsTradeBottomSheet, {
  PerpsTradeSheetTitleBanner,
  usePerpsTradeSheet,
} from './PerpsTradeBottomSheet';

let openCallback: (() => void) | undefined;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactMock = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheetDialog: ReactMock.forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose: () => void },
        ref: React.Ref<unknown>,
      ) => {
        ReactMock.useImperativeHandle(ref, () => ({
          onOpenDialog: (callback: () => void) => {
            openCallback = callback;
          },
          onCloseDialog: (callback: () => void) => callback(),
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

describe('PerpsTradeBottomSheet', () => {
  beforeEach(() => {
    openCallback = undefined;
  });

  it('navigates forward to a nested screen and back to Trade', () => {
    render(
      <PerpsTradeBottomSheet
        onClose={jest.fn()}
        screens={{
          trade: <TradeTestScreen />,
          leverage: <LeverageTestScreen />,
          settings: <Text>Settings</Text>,
          payWith: <Text>Pay with</Text>,
          orderSummary: <Text>Order summary</Text>,
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

  it('closes the dialog through the nested screen API', () => {
    const onClose = jest.fn();

    render(
      <PerpsTradeBottomSheet
        onClose={onClose}
        screens={{
          trade: <CloseTestScreen />,
          leverage: null,
          settings: null,
          payWith: null,
          orderSummary: null,
        }}
      />,
    );

    act(() => openCallback?.());
    fireEvent.press(screen.getByTestId('close-trade'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render a title or banner when the parent omits them', () => {
    render(
      <PerpsTradeBottomSheet
        onClose={jest.fn()}
        screens={{
          trade: <TradeTestScreen />,
          leverage: null,
          settings: null,
          payWith: null,
          orderSummary: null,
        }}
      />,
    );

    act(() => openCallback?.());

    expect(screen.queryByText('Close position')).toBeNull();
    expect(screen.queryByText('Risk warning')).toBeNull();
  });

  it('renders an optional title with the banner directly below it', () => {
    render(
      <PerpsTradeBottomSheet
        onClose={jest.fn()}
        title="Close position"
        banner={<Text>Risk warning</Text>}
        screens={{
          trade: <TitleBannerScreen />,
          leverage: null,
          settings: null,
          payWith: null,
          orderSummary: null,
        }}
      />,
    );

    act(() => openCallback?.());

    const [title, banner] = screen.getAllByText(/Close position|Risk warning/);
    expect(title).toHaveTextContent('Close position');
    expect(banner).toHaveTextContent('Risk warning');
  });
});
