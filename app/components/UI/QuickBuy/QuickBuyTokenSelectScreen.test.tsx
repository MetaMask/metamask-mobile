import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Routes from '../../../constants/navigation/Routes';
import type { BridgeTokenSelectorContentProps } from '../Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import { TokenSelectorType, type BridgeToken } from '../Bridge/types';
import QuickBuyTokenSelectScreen from './QuickBuyTokenSelectScreen';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
import { useQuickBuyContext } from './useQuickBuyContext';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockPickerProps = jest.fn();
jest.mock(
  '../Bridge/components/BridgeTokenSelector/BridgeTokenSelector',
  () => ({
    BridgeTokenSelectorContent: (props: unknown) => {
      mockPickerProps(props);
      return null;
    },
  }),
);

const getPickerProps = (): BridgeTokenSelectorContentProps =>
  mockPickerProps.mock.calls.at(-1)?.[0];

const createToken = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  chainId: '0x1',
  ...overrides,
});

describe('QuickBuyTokenSelectScreen', () => {
  const handleSelectSourceToken = jest.fn();
  const handleSelectDestStable = jest.fn();
  const setActiveScreen = jest.fn();
  const selectedSourceToken = createToken();
  const selectedDestStable = createToken({ symbol: 'USDT' });
  const positionTokenFromSetup = createToken({
    symbol: 'PEPE',
    address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  });

  const renderForMode = (tradeMode: 'buy' | 'sell') => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      tradeMode,
      positionTokenFromSetup,
      selectedSourceToken,
      handleSelectSourceToken,
      selectedDestStable,
      handleSelectDestStable,
      setActiveScreen,
    });
    return render(<QuickBuyTokenSelectScreen />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    {
      tradeMode: 'buy' as const,
      title: 'social_leaderboard.quick_buy.pay_with',
      type: TokenSelectorType.Source,
      balanceOnly: true,
      selected: selectedSourceToken,
      handler: handleSelectSourceToken,
      otherHandler: handleSelectDestStable,
    },
    {
      tradeMode: 'sell' as const,
      title: 'social_leaderboard.quick_buy.receive',
      type: TokenSelectorType.Dest,
      balanceOnly: false,
      selected: selectedDestStable,
      handler: handleSelectDestStable,
      otherHandler: handleSelectSourceToken,
    },
  ])(
    '$tradeMode mode',
    ({
      tradeMode,
      title,
      type,
      balanceOnly,
      selected,
      handler,
      otherHandler,
    }) => {
      it('renders the localized header with its test IDs', () => {
        renderForMode(tradeMode);

        expect(
          screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
        ).toBeOnTheScreen();
        expect(screen.getByText(title)).toBeOnTheScreen();
      });

      it('returns to the amount screen when back is pressed', () => {
        renderForMode(tradeMode);

        fireEvent.press(
          screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BACK),
        );

        expect(setActiveScreen).toHaveBeenCalledWith('amount');
      });

      it('configures the Bridge picker for the mode', () => {
        renderForMode(tradeMode);

        const props = getPickerProps();
        expect(props.type).toBe(type);
        expect(props.balanceOnly).toBe(balanceOnly);
        expect(props.selectedToken).toBe(selected);
        expect(props.excludeToken).toBe(positionTokenFromSetup);
        expect(props.renderScrollComponent).toBe(GestureHandlerScrollView);
      });

      it('selects through the mode handler and returns to the amount screen', () => {
        const token = createToken({ symbol: 'DAI' });
        renderForMode(tradeMode);

        getPickerProps().onTokenPress(token);

        expect(handler).toHaveBeenCalledWith(token);
        expect(otherHandler).not.toHaveBeenCalled();
        expect(setActiveScreen).toHaveBeenCalledWith('amount');
      });

      it('opens the Bridge network list modal', () => {
        renderForMode(tradeMode);

        getPickerProps().onOpenNetworkList();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
        });
      });
    },
  );
});
