import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { PayWithModal } from './pay-with-modal';
import Routes from '../../../../../../constants/navigation/Routes';
import { useTokens } from '../../../../../UI/Bridge/hooks/useTokens';
import { BridgeToken } from '../../../../../UI/Bridge/types';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { cloneDeep, merge } from 'lodash';
import { useTransactionRequiredTokens } from '../../../hooks/pay/useTransactionRequiredTokens';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { initialState } from '../../../../../UI/Bridge/_mocks_/initialState';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { BridgeSourceNetworksBar } from '../../../../../UI/Bridge/components/BridgeSourceNetworksBar';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useSortedSourceNetworks } from '../../../../../UI/Bridge/hooks/useSortedSourceNetworks';

jest.useFakeTimers();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetPayToken = jest.fn();

jest.mock('../../../../../UI/Bridge/hooks/useTokens');
jest.mock('../../../hooks/pay/useTransactionRequiredTokens');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../../../UI/Bridge/components/BridgeSourceNetworksBar');
jest.mock('../../../../../UI/Bridge/hooks/useSortedSourceNetworks');

jest.mock(
  '../../../../../../core/redux/slices/bridge/utils/hasMinimumRequiredVersion',
  () => ({
    hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
  }),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const CHAIN_ID_1_MOCK = CHAIN_IDS.MAINNET;
const CHAIN_ID_2_MOCK = CHAIN_IDS.OPTIMISM;

const TOKENS_MOCK: BridgeToken[] = [
  {
    address: '0x123',
    symbol: 'TST1',
    name: 'Test Token 1',
    decimals: 3,
    chainId: CHAIN_ID_1_MOCK,
    balanceFiat: '$1.23',
    balance: '123',
    tokenFiatAmount: 1.23,
  },
  {
    address: '0x456',
    symbol: 'TST2',
    name: 'Test Token 2',
    decimals: 4,
    chainId: CHAIN_ID_2_MOCK,
    balanceFiat: '$4.56',
    balance: '456',
    tokenFiatAmount: 4.56,
  },
  {
    address: '0x789',
    symbol: 'TST3',
    name: 'Test Token 3',
    decimals: 5,
    chainId: CHAIN_ID_1_MOCK,
    balanceFiat: '$7.89',
    balance: '789',
    tokenFiatAmount: 7.89,
  },
  {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'TST4',
    name: 'Native Token 1',
    decimals: 18,
    chainId: CHAIN_ID_1_MOCK,
    balanceFiat: '$1.00',
    balance: '1',
    tokenFiatAmount: 1,
  },
  {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'TST5',
    name: 'Native Token 2',
    decimals: 18,
    chainId: CHAIN_ID_2_MOCK,
    balanceFiat: '$1.00',
    balance: '1',
    tokenFiatAmount: 1,
  },
];

function render({ minimumFiatBalance }: { minimumFiatBalance?: number } = {}) {
  return renderScreen(
    PayWithModal,
    {
      name: Routes.CONFIRMATION_PAY_WITH_MODAL,
    },
    {
      state: merge(
        {},
        initialState,
        transactionApprovalControllerMock,
        simpleSendTransactionControllerMock,
        otherControllersMock,
      ),
    },
    {
      minimumFiatBalance,
    },
  );
}

describe('PayWithModal', () => {
  const useTokensMock = jest.mocked(useTokens);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const BridgeSourceNetworksBarMock = jest.mocked(BridgeSourceNetworksBar);
  const useSortedSourceNetworksMock = jest.mocked(useSortedSourceNetworks);

  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTokensMock.mockReturnValue({
      tokens: TOKENS_MOCK,
      pending: false,
    });

    useTransactionRequiredTokensMock.mockReturnValue([]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { address: '0x0', chainId: '0x0' },
      setPayToken: mockSetPayToken,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useSortedSourceNetworksMock.mockReturnValue({
      sortedSourceNetworks: [
        {
          chainId: CHAIN_ID_1_MOCK,
          totalFiatValue: 1,
        },
        {
          chainId: CHAIN_ID_2_MOCK,
          totalFiatValue: 1,
        },
      ] as unknown as ReturnType<
        typeof useSortedSourceNetworks
      >['sortedSourceNetworks'],
    });
  });

  it('renders tokens', async () => {
    const { getByText } = render();

    await waitFor(() => {
      expect(getByText('Test Token 1')).toBeDefined();
      expect(getByText('123 TST1')).toBeDefined();
      expect(getByText('$1.23')).toBeDefined();
    });

    await waitFor(() => {
      expect(getByText('Test Token 2')).toBeDefined();
      expect(getByText('456 TST2')).toBeDefined();
      expect(getByText('$4.56')).toBeDefined();
    });

    await waitFor(() => {
      expect(getByText('Test Token 3')).toBeDefined();
      expect(getByText('789 TST3')).toBeDefined();
      expect(getByText('$7.89')).toBeDefined();
    });
  });

  it('renders tokens above minimum fiat balance', async () => {
    const { getByText, queryByText } = render({ minimumFiatBalance: 6.12 });

    await waitFor(() => {
      expect(getByText('Test Token 3')).toBeDefined();
      expect(getByText('789 TST3')).toBeDefined();
      expect(getByText('$7.89')).toBeDefined();
    });

    await waitFor(() => {
      expect(queryByText('Test Token 1')).toBeNull();
    });

    await waitFor(() => {
      expect(queryByText('Test Token 2')).toBeNull();
    });
  });

  it('renders tokens if required and below minimum fiat balance', async () => {
    useTransactionRequiredTokensMock.mockReturnValue([
      { ...TOKENS_MOCK[0], skipIfBalance: false } as never,
    ]);

    const { getByText, queryByText } = render({ minimumFiatBalance: 6.12 });

    await waitFor(() => {
      expect(getByText('Test Token 3')).toBeDefined();
      expect(getByText('789 TST3')).toBeDefined();
      expect(getByText('$7.89')).toBeDefined();
    });

    await waitFor(() => {
      expect(getByText('Test Token 1')).toBeDefined();
      expect(getByText('123 TST1')).toBeDefined();
      expect(getByText('$1.23')).toBeDefined();
    });

    await waitFor(() => {
      expect(queryByText('Test Token 2')).toBeNull();
    });
  });

  it('renders tokens if selected payment token and below minimum fiat balance', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { address: TOKENS_MOCK[0].address, chainId: CHAIN_ID_1_MOCK },
      setPayToken: mockSetPayToken,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    const { getByText, queryByText } = render({ minimumFiatBalance: 6.12 });

    await waitFor(() => {
      expect(getByText('Test Token 3')).toBeDefined();
      expect(getByText('789 TST3')).toBeDefined();
      expect(getByText('$7.89')).toBeDefined();
    });

    await waitFor(() => {
      expect(getByText('Test Token 1')).toBeDefined();
      expect(getByText('123 TST1')).toBeDefined();
      expect(getByText('$1.23')).toBeDefined();
    });

    await waitFor(() => {
      expect(queryByText('Test Token 2')).toBeNull();
    });
  });

  it('does not render tokens if no native balance on chain', async () => {
    const tokens = cloneDeep(TOKENS_MOCK);

    tokens[4].tokenFiatAmount = 0;

    useTokensMock.mockReturnValue({
      tokens,
      pending: false,
    });

    const { getByText, queryByText } = render();

    await waitFor(() => {
      expect(getByText('Test Token 1')).toBeDefined();
      expect(getByText('123 TST1')).toBeDefined();
      expect(getByText('$1.23')).toBeDefined();
    });

    await waitFor(() => {
      expect(queryByText('Test Token 2')).toBeNull();
      expect(queryByText('456 TST2')).toBeNull();
      expect(queryByText('$4.56')).toBeNull();
    });

    await waitFor(() => {
      expect(getByText('Test Token 3')).toBeDefined();
      expect(getByText('789 TST3')).toBeDefined();
      expect(getByText('$7.89')).toBeDefined();
    });
  });

  it('displays supported networks in networks bar', async () => {
    render();

    expect(BridgeSourceNetworksBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        networksToShow: [
          expect.objectContaining({ chainId: CHAIN_ID_1_MOCK }),
          expect.objectContaining({ chainId: CHAIN_ID_2_MOCK }),
        ],
        enabledSourceChains: [
          expect.objectContaining({ chainId: CHAIN_ID_1_MOCK }),
          expect.objectContaining({ chainId: CHAIN_ID_2_MOCK }),
        ],
        selectedSourceChainIds: [CHAIN_ID_1_MOCK, CHAIN_ID_2_MOCK],
      }),
      expect.anything(),
    );
  });

  it('hides networks with no fiat value', async () => {
    useSortedSourceNetworksMock.mockReturnValue({
      sortedSourceNetworks: [
        {
          chainId: CHAIN_ID_1_MOCK,
          totalFiatValue: 0,
        },
        {
          chainId: CHAIN_ID_2_MOCK,
          totalFiatValue: 1,
        },
      ] as unknown as ReturnType<
        typeof useSortedSourceNetworks
      >['sortedSourceNetworks'],
    });

    render();

    expect(BridgeSourceNetworksBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        networksToShow: [expect.objectContaining({ chainId: CHAIN_ID_2_MOCK })],
        enabledSourceChains: [
          expect.objectContaining({ chainId: CHAIN_ID_1_MOCK }),
          expect.objectContaining({ chainId: CHAIN_ID_2_MOCK }),
        ],
        selectedSourceChainIds: [CHAIN_ID_2_MOCK],
      }),
      expect.anything(),
    );
  });

  describe('on token select', () => {
    it('sets pay asset', async () => {
      const { getByText } = render();

      await waitFor(() => {
        fireEvent.press(getByText('Test Token 2'));
      });

      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: TOKENS_MOCK[1].address,
        chainId: TOKENS_MOCK[1].chainId,
      });
    });

    it('navigates back', async () => {
      const { getByText } = render();

      await waitFor(() => {
        fireEvent.press(getByText('Test Token 2'));
      });

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('on network select', () => {
    it('navigates to network selector', async () => {
      const originalNetworkBar = jest.requireActual(
        '../../../../../UI/Bridge/components/BridgeSourceNetworksBar',
      ).BridgeSourceNetworksBar;

      BridgeSourceNetworksBarMock.mockImplementation((props) =>
        originalNetworkBar(props),
      );

      const { getByText } = render();

      await waitFor(() => {
        fireEvent.press(getByText('All networks'));
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CONFIRMATION_PAY_WITH_NETWORK_MODAL,
      );
    });
  });
});
