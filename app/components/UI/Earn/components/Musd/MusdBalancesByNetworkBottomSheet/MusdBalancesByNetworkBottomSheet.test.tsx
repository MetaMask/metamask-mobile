import React from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import MusdBalancesByNetworkBottomSheet, {
  MusdBalancesByNetworkBottomSheetTestIds,
} from './index';
import { useMusdBalance } from '../../../hooks/useMusdBalance';
import { MUSD_TOKEN } from '../../../constants/musd';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import initialRootState from '../../../../../../util/test/initial-root-state';

jest.mock('react-redux', () => {
  const actual =
    jest.requireActual<typeof import('react-redux')>('react-redux');
  return {
    ...actual,
    useSelector: jest.fn(),
  };
});
jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual<typeof import('react')>('react');
    const { View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        (
          props: { children: React.ReactNode; testID?: string },
          ref: React.Ref<{ onCloseBottomSheet: () => void }>,
        ) => {
          ReactModule.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: jest.fn(),
          }));
          return (
            <View testID={props.testID ?? 'bottom-sheet-mock'}>
              {props.children}
            </View>
          );
        },
      ),
    };
  },
);
jest.mock('../../../hooks/useMusdBalance');
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn(
    (key: string, params?: { amount?: string; symbol?: string }) => {
      if (key === 'earn.musd_conversion.balance_breakdown_title') {
        return 'Your mUSD balances by network';
      }
      if (
        key === 'earn.musd_conversion.balance_amount_with_symbol' &&
        params?.amount !== undefined &&
        params?.symbol !== undefined
      ) {
        return `${params.amount} ${params.symbol}`;
      }
      if (key === 'earn.musd_conversion.balance_fiat_unavailable') {
        return '—';
      }
      return key;
    },
  ),
}));
jest.mock('../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

const mockUseMusdBalance = useMusdBalance as jest.MockedFunction<
  typeof useMusdBalance
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const createEmptyBalanceMock = () => ({
  tokenBalanceByChain: {} as Record<Hex, string>,
  fiatBalanceByChain: {} as Record<Hex, string>,
  fiatBalanceFormattedByChain: {} as Record<Hex, string>,
  hasMusdBalanceOnAnyChain: false,
  hasMusdBalanceOnChain: jest.fn(),
  tokenBalanceAggregated: '0',
  fiatBalanceAggregated: undefined,
  fiatBalanceAggregatedFormatted: '$0.00',
});

const createSingleChainBalanceMock = (
  overrides: {
    tokenBalanceByChain?: Record<Hex, string>;
    fiatBalanceByChain?: Record<Hex, string>;
    fiatBalanceFormattedByChain?: Record<Hex, string>;
  } = {},
) => ({
  tokenBalanceByChain: {
    [CHAIN_IDS.MAINNET]: '100',
  } as Record<Hex, string>,
  fiatBalanceByChain: {
    [CHAIN_IDS.MAINNET]: '100',
  } as Record<Hex, string>,
  fiatBalanceFormattedByChain: {
    [CHAIN_IDS.MAINNET]: '$100.00',
  } as Record<Hex, string>,
  hasMusdBalanceOnAnyChain: true,
  hasMusdBalanceOnChain: jest.fn(),
  tokenBalanceAggregated: '100',
  fiatBalanceAggregated: '100',
  fiatBalanceAggregatedFormatted: '$100.00',
  ...overrides,
});

const createMultiChainBalanceMock = (
  overrides: {
    tokenBalanceByChain?: Record<Hex, string>;
    fiatBalanceByChain?: Record<Hex, string>;
    fiatBalanceFormattedByChain?: Record<Hex, string>;
  } = {},
) => ({
  tokenBalanceByChain: {
    [CHAIN_IDS.MAINNET]: '100',
    [CHAIN_IDS.LINEA_MAINNET]: '50',
  } as Record<Hex, string>,
  fiatBalanceByChain: {
    [CHAIN_IDS.MAINNET]: '100',
    [CHAIN_IDS.LINEA_MAINNET]: '50',
  } as Record<Hex, string>,
  fiatBalanceFormattedByChain: {
    [CHAIN_IDS.MAINNET]: '$100.00',
    [CHAIN_IDS.LINEA_MAINNET]: '$50.00',
  } as Record<Hex, string>,
  hasMusdBalanceOnAnyChain: true,
  hasMusdBalanceOnChain: jest.fn(),
  tokenBalanceAggregated: '150',
  fiatBalanceAggregated: '150',
  fiatBalanceAggregatedFormatted: '$150.00',
  ...overrides,
});

describe('MusdBalancesByNetworkBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectNetworkConfigurations) {
        return {
          [CHAIN_IDS.MAINNET]: { name: 'Ethereum' },
          [CHAIN_IDS.LINEA_MAINNET]: { name: 'Linea' },
        };
      }
      return undefined;
    });
  });

  describe('rendering', () => {
    it('renders bottom sheet container', () => {
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByTestId } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(
        getByTestId(MusdBalancesByNetworkBottomSheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders balance breakdown title', () => {
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText('Your mUSD balances by network')).toBeOnTheScreen();
    });

    it('renders no network rows when useMusdBalance returns empty balances', () => {
      mockUseMusdBalance.mockReturnValue(
        createEmptyBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByTestId, queryByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(
        getByTestId(MusdBalancesByNetworkBottomSheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(queryByText('Ethereum')).toBeNull();
      expect(queryByText('Linea')).toBeNull();
    });

    it('displays network name from networkConfigurations when single chain has balance', () => {
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText('Ethereum')).toBeOnTheScreen();
    });

    it('displays token balance with mUSD symbol when single chain has balance', () => {
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText(`100.00 ${MUSD_TOKEN.symbol}`)).toBeOnTheScreen();
    });

    it('displays fiat balance when fiatBalanceFormattedByChain is available', () => {
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText('$100.00')).toBeOnTheScreen();
    });

    it('displays fiat unavailable placeholder when fiatBalanceFormattedByChain is missing', () => {
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock({
          fiatBalanceFormattedByChain: {},
        }) as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText('—')).toBeOnTheScreen();
    });

    it('displays both networks when multiple chains have balance', () => {
      mockUseMusdBalance.mockReturnValue(
        createMultiChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(getByText('Linea')).toBeOnTheScreen();
    });

    it('sorts rows by fiat balance descending when multiple chains have balance', () => {
      mockUseMusdBalance.mockReturnValue(
        createMultiChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getAllByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      const networkNames = getAllByText(/Ethereum|Linea/);
      expect(networkNames[0].props.children).toBe('Ethereum');
      expect(networkNames[1].props.children).toBe('Linea');
    });

    it('sorts rows by token balance when fiat balances are equal', () => {
      mockUseMusdBalance.mockReturnValue(
        createMultiChainBalanceMock({
          fiatBalanceByChain: {
            [CHAIN_IDS.MAINNET]: '0',
            [CHAIN_IDS.LINEA_MAINNET]: '0',
          },
          fiatBalanceFormattedByChain: {
            [CHAIN_IDS.MAINNET]: '$0.00',
            [CHAIN_IDS.LINEA_MAINNET]: '$0.00',
          },
        }) as ReturnType<typeof useMusdBalance>,
      );

      const { getAllByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      const networkNames = getAllByText(/Ethereum|Linea/);
      expect(networkNames[0].props.children).toBe('Ethereum');
      expect(networkNames[1].props.children).toBe('Linea');
    });

    it('uses chainId as network name when networkConfigurations has no name for chain', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectNetworkConfigurations) {
          return {
            [CHAIN_IDS.MAINNET]: {},
            [CHAIN_IDS.LINEA_MAINNET]: { name: 'Linea' },
          };
        }
        return undefined;
      });
      mockUseMusdBalance.mockReturnValue(
        createSingleChainBalanceMock() as ReturnType<typeof useMusdBalance>,
      );

      const { getByText } = renderWithProvider(
        <MusdBalancesByNetworkBottomSheet />,
        { state: initialRootState },
      );

      expect(getByText(CHAIN_IDS.MAINNET)).toBeOnTheScreen();
    });
  });
});
