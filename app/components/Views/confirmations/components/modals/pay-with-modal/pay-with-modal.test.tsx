import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { PayWithModal } from './pay-with-modal';
import Routes from '../../../../../../constants/navigation/Routes';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { merge } from 'lodash';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { initialState } from '../../../../../UI/Bridge/_mocks_/initialState';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import {
  CHAIN_IDS,
  TransactionType,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { AssetType, TokenStandard } from '../../../types/token';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { useRoute } from '@react-navigation/native';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { EMPTY_ADDRESS } from '../../../../../../constants/transaction';

jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/send/useAccountTokens');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

const CHAIN_ID_1_MOCK = CHAIN_IDS.MAINNET as Hex;
const CHAIN_ID_2_MOCK = '0x2' as Hex;

const TOKENS_MOCK = [
  {
    accountType: EthAccountType.Eoa,
    address: NATIVE_TOKEN_ADDRESS,
    balance: '1.23',
    balanceInSelectedCurrency: '$1.23',
    chainId: CHAIN_ID_1_MOCK,
    decimals: 18,
    name: 'Native Token 1',
    standard: TokenStandard.ERC20,
    symbol: 'NTV1',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0x123',
    balance: '2.34',
    balanceInSelectedCurrency: '$2.34',
    chainId: CHAIN_ID_1_MOCK,
    decimals: 6,
    name: 'Test Token 1',
    standard: TokenStandard.ERC20,
    symbol: 'TST1',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0x234',
    balance: '0',
    balanceInSelectedCurrency: '$0.00',
    chainId: CHAIN_ID_1_MOCK,
    decimals: 6,
    name: 'Test Token 2',
    standard: TokenStandard.ERC20,
    symbol: 'TST2',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0x345',
    balance: '3.45',
    balanceInSelectedCurrency: '$3.45',
    chainId: CHAIN_ID_1_MOCK,
    decimals: 6,
    name: 'Test Token 3',
    standard: TokenStandard.ERC721,
    symbol: 'TST3',
  },
  {
    accountType: SolAccountType.DataAccount,
    address: '0x456',
    balance: '4.56',
    balanceInSelectedCurrency: '$4.56',
    chainId: CHAIN_ID_1_MOCK,
    decimals: 6,
    name: 'Test Token 4',
    standard: TokenStandard.ERC20,
    symbol: 'TST4',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0x567',
    balance: '5.67',
    balanceInSelectedCurrency: '$5.67',
    chainId: CHAIN_ID_2_MOCK,
    decimals: 6,
    name: 'Test Token 5',
    standard: TokenStandard.ERC20,
    symbol: 'TST5',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    balance: '6.78',
    balanceInSelectedCurrency: '$6.78',
    chainId: CHAIN_ID_1_MOCK,
    decimals: 6,
    name: 'USD Coin',
    standard: TokenStandard.ERC20,
    symbol: 'USDC',
  },
] as AssetType[];

const REQUIRED_TOKENS_MOCK = [] as TransactionPayRequiredToken[];

const MUSD_ALLOWLIST_MOCK = {
  [CHAIN_ID_1_MOCK]: ['USDC'],
};

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
        {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensAllowlist: MUSD_ALLOWLIST_MOCK,
                },
              },
            },
          },
        },
      ),
    },
    {
      minimumFiatBalance,
    },
  );
}

describe('PayWithModal', () => {
  const setPayTokenMock = jest.fn();
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useAccountTokensMock.mockReturnValue(TOKENS_MOCK);
    useTransactionPayRequiredTokensMock.mockReturnValue(REQUIRED_TOKENS_MOCK);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { address: NATIVE_TOKEN_ADDRESS, chainId: CHAIN_ID_1_MOCK },
      setPayToken: setPayTokenMock,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    mockUseRoute.mockReturnValue({
      params: {},
    } as unknown as ReturnType<typeof useRoute>);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: CHAIN_ID_1_MOCK,
      networkClientId: '',
      status: TransactionStatus.unapproved,
      time: 0,
      txParams: {
        from: EMPTY_ADDRESS,
      },
      type: TransactionType.simpleSend,
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
  });

  it('renders tokens', async () => {
    const { getByText } = render();

    expect(getByText('Native Token 1')).toBeDefined();
    expect(getByText('1.23 NTV1')).toBeDefined();
    expect(getByText('$1.23')).toBeDefined();

    expect(getByText('Test Token 1')).toBeDefined();
    expect(getByText('2.34 TST1')).toBeDefined();
    expect(getByText('$2.34')).toBeDefined();
  });

  describe('on token select', () => {
    it('sets pay asset', async () => {
      const { getByText } = render();

      await waitFor(() => {
        fireEvent.press(getByText('Test Token 1'));
      });

      expect(setPayTokenMock).toHaveBeenCalledWith({
        address: TOKENS_MOCK[1].address,
        chainId: TOKENS_MOCK[1].chainId,
      });
    });
  });

  describe('tokenFilter', () => {
    describe('when transaction type is musdConversion', () => {
      it('filters tokens using musd conversion payment allowlist', async () => {
        useTransactionMetadataRequestMock.mockReturnValue({
          id: transactionIdMock,
          chainId: CHAIN_ID_1_MOCK,
          networkClientId: '',
          status: TransactionStatus.unapproved,
          time: 0,
          txParams: {
            from: EMPTY_ADDRESS,
          },
          type: TransactionType.musdConversion,
        } as unknown as ReturnType<typeof useTransactionMetadataRequest>);

        const { getByText, queryByText } = render();

        expect(getByText('USD Coin')).toBeDefined();
        expect(getByText('USDC')).toBeDefined();

        expect(queryByText('Test Token 1')).toBeNull();
        expect(queryByText('Test Token 2')).toBeNull();
      });
    });

    describe('when transaction type is NOT musdConversion', () => {
      it('shows all available tokens without mUSD allowlist filtering', async () => {
        useTransactionMetadataRequestMock.mockReturnValue({
          id: transactionIdMock,
          chainId: CHAIN_ID_1_MOCK,
          networkClientId: '',
          status: TransactionStatus.unapproved,
          time: 0,
          txParams: {
            from: EMPTY_ADDRESS,
          },
          type: TransactionType.simpleSend,
        } as unknown as ReturnType<typeof useTransactionMetadataRequest>);

        const { getByText } = render();

        expect(getByText('Native Token 1')).toBeDefined();
        expect(getByText('Test Token 1')).toBeDefined();
        expect(getByText('USD Coin')).toBeDefined();
      });
    });
  });
});
