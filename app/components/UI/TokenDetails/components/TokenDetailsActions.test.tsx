import React from 'react';
import {
  TokenDetailsActions,
  TokenDetailsActionsSkeleton,
  TokenDetailsActionsProps,
} from './TokenDetailsActions';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      addListener: jest.fn(() => jest.fn()),
    }),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
  };
});

jest.mock('../../Ramp/Deposit/hooks/useDepositEnabled', () => ({
  __esModule: true,
  default: () => ({ isDepositEnabled: true }),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
    })),
  }),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('TokenDetailsActions', () => {
  const mockToken: TokenI = {
    address: '0x123',
    chainId: '0x1',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    balance: '100',
    balanceFiat: '$100',
    logo: '',
    image: '',
    isETH: false,
    hasBalanceError: false,
    aggregators: [],
  };

  const defaultProps: TokenDetailsActionsProps = {
    hasPerpsMarket: false,
    hasBalance: false,
    isBuyable: true,
    isNativeCurrency: false,
    token: mockToken,
    onBuy: jest.fn(),
    onLong: jest.fn(),
    onShort: jest.fn(),
    onSend: jest.fn(),
    onReceive: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      const { UNSAFE_queryAllByType, queryByTestId } = renderWithProvider(
        <TokenDetailsActions {...defaultProps} isLoading />,
        { state: mockInitialState },
      );

      const { Skeleton } = jest.requireActual(
        '../../../../component-library/components/Skeleton',
      );
      const skeletons = UNSAFE_queryAllByType(Skeleton);
      expect(skeletons).toHaveLength(4);
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('TokenDetailsActionsSkeleton', () => {
    it('renders 4 skeleton buttons', () => {
      const { UNSAFE_queryAllByType } = renderWithProvider(
        <TokenDetailsActionsSkeleton />,
        { state: mockInitialState },
      );

      const { Skeleton } = jest.requireActual(
        '../../../../component-library/components/Skeleton',
      );
      const skeletons = UNSAFE_queryAllByType(Skeleton);
      expect(skeletons).toHaveLength(4);
    });
  });

  describe('button layout with perps market and balance', () => {
    it('renders Long, Short, Send, More buttons when hasPerpsMarket and hasBalance are true', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <TokenDetailsActions {...defaultProps} hasPerpsMarket hasBalance />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.MORE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('button layout with perps market and no balance', () => {
    it('renders Long, Short, Receive, More buttons when hasPerpsMarket is true and hasBalance is false', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <TokenDetailsActions
          {...defaultProps}
          hasPerpsMarket
          hasBalance={false}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.MORE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('button layout without perps market and buyable', () => {
    it('renders Buy, Send, Receive, More buttons when hasPerpsMarket is false and isBuyable is true', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <TokenDetailsActions
          {...defaultProps}
          hasPerpsMarket={false}
          isBuyable
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.MORE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('button layout without perps market and not buyable', () => {
    it('renders Send, Receive, More buttons when hasPerpsMarket is false and isBuyable is false', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <TokenDetailsActions
          {...defaultProps}
          hasPerpsMarket={false}
          isBuyable={false}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.MORE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });
});
