import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  QuickBuySheetHostProvider,
  useQuickBuySheet,
  type QuickBuySheetOptions,
} from './QuickBuySheetHost';
import type { QuickBuyRootProps } from './types';

const mockQuickBuyRoot = jest.fn<void, [QuickBuyRootProps]>();
jest.mock('./QuickBuyRoot', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: QuickBuyRootProps) => {
      mockQuickBuyRoot(props);
      return <MockView testID="mock-quick-buy-root" />;
    },
  };
});

const options: QuickBuySheetOptions = {
  target: {
    tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    chain: 'eip155:1',
  },
  initialTradeMode: 'buy',
  analyticsContext: { source: 'trader_feed' },
};

const Consumer: React.FC<{ testIdPrefix?: string }> = ({
  testIdPrefix = '',
}) => {
  const { openQuickBuy, closeQuickBuy, quickBuySheet } = useQuickBuySheet();
  return (
    <View testID={`${testIdPrefix}consumer`}>
      <Pressable
        testID={`${testIdPrefix}open`}
        onPress={() => openQuickBuy(options)}
      />
      <Pressable testID={`${testIdPrefix}close`} onPress={closeQuickBuy} />
      {quickBuySheet}
    </View>
  );
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TestParamList = {
  Tabs: undefined;
  ConsumerTab: undefined;
  OtherTab: undefined;
  Pushed: undefined;
};

const Stack = createNativeStackNavigator<TestParamList>();
const Tab = createBottomTabNavigator<TestParamList>();

const ConsumerTab = () => <Consumer />;
const OtherTab = () => <Text>Other tab</Text>;
const PushedScreen = () => <Text>Pushed screen</Text>;

const renderInHomeTabs = () => {
  const navigationRef = createNavigationContainerRef<TestParamList>();

  render(
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs">
          {() => (
            <QuickBuySheetHostProvider>
              <Tab.Navigator
                tabBar={() => null}
                screenOptions={{ headerShown: false }}
              >
                <Tab.Screen name="ConsumerTab" component={ConsumerTab} />
                <Tab.Screen name="OtherTab" component={OtherTab} />
              </Tab.Navigator>
            </QuickBuySheetHostProvider>
          )}
        </Stack.Screen>
        <Stack.Screen name="Pushed" component={PushedScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );

  return navigationRef;
};

describe('QuickBuySheetHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without a host', () => {
    it('renders nothing until Quick Buy is opened', () => {
      render(<Consumer />);

      expect(screen.queryByTestId('mock-quick-buy-root')).toBeNull();
    });

    it('renders the sheet inline with the given options', () => {
      render(<Consumer />);

      fireEvent.press(screen.getByTestId('open'));

      expect(
        within(screen.getByTestId('consumer')).getByTestId(
          'mock-quick-buy-root',
        ),
      ).toBeOnTheScreen();
      expect(mockQuickBuyRoot).toHaveBeenLastCalledWith(
        expect.objectContaining({ ...options, isVisible: true }),
      );
    });

    it('closes the inline sheet when the sheet dismisses itself', () => {
      render(<Consumer />);
      fireEvent.press(screen.getByTestId('open'));

      act(() => mockQuickBuyRoot.mock.lastCall?.[0].onClose());

      expect(screen.queryByTestId('mock-quick-buy-root')).toBeNull();
    });
  });

  describe('inside a host', () => {
    it('renders the sheet in the host instead of the consumer', () => {
      render(
        <QuickBuySheetHostProvider>
          <Consumer />
        </QuickBuySheetHostProvider>,
      );

      fireEvent.press(screen.getByTestId('open'));

      expect(screen.getByTestId('mock-quick-buy-root')).toBeOnTheScreen();
      expect(
        within(screen.getByTestId('consumer')).queryByTestId(
          'mock-quick-buy-root',
        ),
      ).toBeNull();
      expect(mockQuickBuyRoot).toHaveBeenLastCalledWith(
        expect.objectContaining({ ...options, isVisible: true }),
      );
    });

    it('closes the hosted sheet from the consumer', () => {
      render(
        <QuickBuySheetHostProvider>
          <Consumer />
        </QuickBuySheetHostProvider>,
      );
      fireEvent.press(screen.getByTestId('open'));

      fireEvent.press(screen.getByTestId('close'));

      expect(screen.queryByTestId('mock-quick-buy-root')).toBeNull();
    });

    it('closes the hosted sheet when the sheet dismisses itself', () => {
      render(
        <QuickBuySheetHostProvider>
          <Consumer />
        </QuickBuySheetHostProvider>,
      );
      fireEvent.press(screen.getByTestId('open'));

      act(() => mockQuickBuyRoot.mock.lastCall?.[0].onClose());

      expect(screen.queryByTestId('mock-quick-buy-root')).toBeNull();
    });

    it('keeps the hosted sheet open when another consumer closes', () => {
      render(
        <QuickBuySheetHostProvider>
          <Consumer />
          <Consumer testIdPrefix="other-" />
        </QuickBuySheetHostProvider>,
      );
      fireEvent.press(screen.getByTestId('open'));

      fireEvent.press(screen.getByTestId('other-close'));

      expect(screen.getByTestId('mock-quick-buy-root')).toBeOnTheScreen();
    });

    it('closes the hosted sheet when the consumer that opened it unmounts', () => {
      const { rerender } = render(
        <QuickBuySheetHostProvider>
          <Consumer />
        </QuickBuySheetHostProvider>,
      );
      fireEvent.press(screen.getByTestId('open'));

      rerender(<QuickBuySheetHostProvider>{null}</QuickBuySheetHostProvider>);

      expect(screen.queryByTestId('mock-quick-buy-root')).toBeNull();
    });
  });

  describe('inside the home tabs host', () => {
    it('closes the hosted sheet when another tab is selected', async () => {
      const navigationRef = renderInHomeTabs();
      fireEvent.press(screen.getByTestId('open'));

      await act(async () => {
        navigationRef.navigate('OtherTab');
      });

      expect(screen.queryByTestId('mock-quick-buy-root')).toBeNull();
    });

    it('keeps the hosted sheet open when a screen is pushed above the tabs', async () => {
      const navigationRef = renderInHomeTabs();
      fireEvent.press(screen.getByTestId('open'));

      await act(async () => {
        navigationRef.navigate('Pushed');
      });

      expect(screen.getByText('Pushed screen')).toBeOnTheScreen();
      // The covered Tabs screen is aria-hidden, so the default query skips it.
      expect(
        screen.getByTestId('mock-quick-buy-root', {
          includeHiddenElements: true,
        }),
      ).toBeOnTheScreen();
    });
  });
});
