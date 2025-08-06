import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { PayWithModal } from './pay-with-modal';
import { initialState } from '../../../../../UI/Bridge/_mocks_/initialState';
import Routes from '../../../../../../constants/navigation/Routes';
import { useTokens } from '../../../../../UI/Bridge/hooks/useTokens';
import { Hex } from '@metamask/utils';
import { BridgeToken } from '../../../../../UI/Bridge/types';

jest.useFakeTimers();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetPayToken = jest.fn();

jest.mock('../../../../../UI/Bridge/hooks/useTokens');

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

jest.mock('../../../hooks/pay/useTransactionPayToken', () => ({
  useTransactionPayToken: () => ({
    payToken: { address: '0x0', chainId: '0x0' },
    setPayToken: mockSetPayToken,
  }),
}));

const CHAIN_ID_1_MOCK = '0x123' as Hex;
const CHAIN_ID_2_MOCK = '0x456' as Hex;

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
];

function render({ minimumFiatBalance }: { minimumFiatBalance?: number } = {}) {
  return renderScreen(
    PayWithModal,
    {
      name: Routes.CONFIRMATION_PAY_WITH_MODAL,
    },
    {
      state: initialState,
    },
    {
      minimumFiatBalance,
    },
  );
}

describe('PayWithModal', () => {
  const useTokensMock = jest.mocked(useTokens);

  beforeEach(() => {
    jest.clearAllMocks();

    useTokensMock.mockReturnValue({
      tokens: TOKENS_MOCK,
      pending: false,
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
