import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';

jest.mock('../../../../hooks/useMusdBalance');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
jest.mock('../../../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, number>) => {
    if (key === 'earn.musd_conversion.percentage_boost' && params?.percentage) {
      return `Earn ${params.percentage}% APY`;
    }
    return key;
  }),
}));
jest.mock('../../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import MusdBalanceCard from './MusdBalanceCard';
import { useMusdBalance } from '../../../../hooks/useMusdBalance';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../../hooks/useStyles';
import { MUSD_CONVERSION_APY, MUSD_TOKEN } from '../../../../constants/musd';
import Routes from '../../../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../../../util/test/initial-root-state';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

const mockNavigate = jest.fn();

const createMockStyles = () => ({
  container: {},
  containerPressed: {},
  left: {},
  right: {},
  networkRow: {},
  tokenIconContainer: {},
  tokenIcon: {},
});

const mockUseMusdBalance = useMusdBalance as jest.MockedFunction<
  typeof useMusdBalance
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

describe('MusdBalanceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      canGoBack: jest.fn().mockReturnValue(true),
      getParent: jest.fn(),
      getId: jest.fn(),
      getState: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    } as ReturnType<typeof useNavigation>);
    mockUseStyles.mockReturnValue({
      styles: createMockStyles(),
      theme: {},
    } as ReturnType<typeof useStyles>);
  });

  describe('rendering', () => {
    it('renders card with musd-balance-card testID', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: '$100.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '100',
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      expect(getByTestId('musd-balance-card')).toBeOnTheScreen();
    });

    it('displays aggregated fiat balance from useMusdBalance', () => {
      const formattedBalance = '$1,234.56';
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: formattedBalance,
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '1234.56',
      });

      const { getByText } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      expect(getByText(formattedBalance)).toBeOnTheScreen();
    });

    it('displays mUSD symbol when single network has balance', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: '$100.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '100',
      });

      const { getByText } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      expect(getByText(MUSD_TOKEN.symbol)).toBeOnTheScreen();
    });

    it('displays percentage boost text from localization', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: '$100.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '100',
      });

      const { getByText } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      expect(getByText(`Earn ${MUSD_CONVERSION_APY}% APY`)).toBeOnTheScreen();
    });

    it('displays percent change as +0.00% when percentChange is zero', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: '$100.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '100',
      });

      const { getByText } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      expect(getByText('+0.00%')).toBeOnTheScreen();
    });

    it('displays AvatarGroup when multiple networks have balance', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100',
          [CHAIN_IDS.LINEA_MAINNET]: '50',
        } as Record<Hex, string>,
        fiatBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100',
          [CHAIN_IDS.LINEA_MAINNET]: '50',
        } as Record<Hex, string>,
        fiatBalanceAggregatedFormatted: '$150.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '150',
        fiatBalanceAggregated: '150',
      });

      const { getByTestId, queryByText } = renderWithProvider(
        <MusdBalanceCard />,
        {
          state: initialRootState,
        },
      );

      expect(getByTestId('musd-balance-card')).toBeOnTheScreen();
      expect(queryByText(MUSD_TOKEN.symbol)).toBeNull();
    });
  });

  describe('press behavior', () => {
    it('card is disabled when single chain has balance', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: '$100.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '100',
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      const card = getByTestId('musd-balance-card');

      expect(card.props.accessibilityState?.disabled).toBe(true);
    });

    it('card is enabled when multiple chains have balance', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100',
          [CHAIN_IDS.LINEA_MAINNET]: '50',
        } as Record<Hex, string>,
        fiatBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100',
          [CHAIN_IDS.LINEA_MAINNET]: '50',
        } as Record<Hex, string>,
        fiatBalanceAggregatedFormatted: '$150.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '150',
        fiatBalanceAggregated: '150',
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      const card = getByTestId('musd-balance-card');

      expect(card.props.accessibilityState?.disabled).toBe(false);
    });

    it('navigates to MUSD_BALANCES_BY_NETWORK when card is pressed and multiple chains', async () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100',
          [CHAIN_IDS.LINEA_MAINNET]: '50',
        } as Record<Hex, string>,
        fiatBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100',
          [CHAIN_IDS.LINEA_MAINNET]: '50',
        } as Record<Hex, string>,
        fiatBalanceAggregatedFormatted: '$150.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '150',
        fiatBalanceAggregated: '150',
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      const card = getByTestId('musd-balance-card');

      await act(async () => {
        fireEvent.press(card);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.MODALS.ROOT, {
        screen: Routes.EARN.MODALS.MUSD_BALANCES_BY_NETWORK,
      });
    });

    it('does not navigate when card is pressed and single chain', async () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceByChain: { [CHAIN_IDS.MAINNET]: '100' } as Record<
          Hex,
          string
        >,
        fiatBalanceAggregatedFormatted: '$100.00',
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '100',
        fiatBalanceAggregated: '100',
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      const card = getByTestId('musd-balance-card');

      await act(async () => {
        fireEvent.press(card);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('renders with empty balance when no chains have mUSD', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: {} as Record<Hex, string>,
        fiatBalanceByChain: {} as Record<Hex, string>,
        fiatBalanceAggregatedFormatted: undefined as unknown as string,
        hasMusdBalanceOnAnyChain: false,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '0',
        fiatBalanceAggregated: undefined,
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      expect(getByTestId('musd-balance-card')).toBeOnTheScreen();
    });

    it('card is disabled when no chains have balance', () => {
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceByChain: {} as Record<Hex, string>,
        fiatBalanceByChain: {} as Record<Hex, string>,
        fiatBalanceAggregatedFormatted: undefined as unknown as string,
        hasMusdBalanceOnAnyChain: false,
        hasMusdBalanceOnChain: jest.fn(),
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '0',
        fiatBalanceAggregated: undefined,
      });

      const { getByTestId } = renderWithProvider(<MusdBalanceCard />, {
        state: initialRootState,
      });

      const card = getByTestId('musd-balance-card');

      expect(card.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
