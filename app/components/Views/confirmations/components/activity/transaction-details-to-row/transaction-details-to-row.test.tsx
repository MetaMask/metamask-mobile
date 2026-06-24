import React from 'react';
import { type Hex } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsToRow } from './transaction-details-to-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../utils/transaction';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext', () => ({
  useIsMoneyAccountContext: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../utils/transaction-pay', () => ({
  ...jest.requireActual('../../../utils/transaction-pay'),
  getTokenTransferData: jest.fn(),
}));
jest.mock('../../../utils/transaction', () => ({
  ...jest.requireActual('../../../utils/transaction'),
  parseStandardTokenTransactionData: jest.fn(),
}));
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => () => null,
);
jest.mock('../../../../../UI/Name/Name', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: string }) => <Text>{value}</Text>,
  };
});
jest.mock('../../../../../UI/Name/Name.types', () => ({
  NameType: { EthereumAddress: 'EthereumAddress' },
}));

const CHAIN_ID_MOCK = '0x1' as Hex;
const RECIPIENT_MOCK = '0xRecipient' as Hex;

function createTransactionMeta(
  type: TransactionType,
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'test-tx',
    chainId: CHAIN_ID_MOCK,
    type,
    txParams: { from: '0xSender' },
    ...overrides,
  } as TransactionMeta;
}

function render() {
  return renderWithProvider(<TransactionDetailsToRow />, {});
}

describe('TransactionDetailsToRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const getTokenTransferDataMock = jest.mocked(getTokenTransferData);
  const parseStandardTokenTransactionDataMock = jest.mocked(
    parseStandardTokenTransactionData,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    getTokenTransferDataMock.mockReturnValue({
      data: '0xTransferData',
      to: '0xToken' as Hex,
    });

    parseStandardTokenTransactionDataMock.mockReturnValue({
      args: { _to: RECIPIENT_MOCK },
    } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);
  });

  it('renders nothing for unsupported transaction types', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(TransactionType.simpleSend),
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('renders recipient address for moneyAccountWithdraw', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(
        TransactionType.moneyAccountWithdraw,
      ),
    });

    const { getByText } = render();
    expect(getByText(RECIPIENT_MOCK)).toBeDefined();
  });

  it('renders "Perps Account 1" label for perpsDeposit', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(TransactionType.perpsDeposit),
    });

    const { getByText } = render();
    expect(getByText('Perps Account 1')).toBeDefined();
  });

  it('renders "Predictions Account 1" label for predictDeposit', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(TransactionType.predictDeposit),
    });

    const { getByText } = render();
    expect(getByText('Predictions Account 1')).toBeDefined();
  });

  it('renders nothing when no recipient can be decoded', () => {
    getTokenTransferDataMock.mockReturnValue(undefined);
    parseStandardTokenTransactionDataMock.mockReturnValue(undefined);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(
        TransactionType.moneyAccountWithdraw,
      ),
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('renders "To" label for the row', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(
        TransactionType.moneyAccountWithdraw,
      ),
    });

    const { getByText } = render();
    expect(getByText('To')).toBeDefined();
  });

  it('renders "Money account" label for perpsWithdraw in money context', () => {
    const { useIsMoneyAccountContext: useIsMoneyAccountContextMock } =
      jest.requireMock('../../../hooks/activity/useIsMoneyAccountContext');
    useIsMoneyAccountContextMock.mockReturnValue(true);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(TransactionType.perpsWithdraw),
    });

    const { getByText } = render();
    expect(getByText('Money account')).toBeDefined();
  });

  it('renders "Money account" label for predictWithdraw in money context', () => {
    const { useIsMoneyAccountContext: useIsMoneyAccountContextMock } =
      jest.requireMock('../../../hooks/activity/useIsMoneyAccountContext');
    useIsMoneyAccountContextMock.mockReturnValue(true);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(TransactionType.predictWithdraw),
    });

    const { getByText } = render();
    expect(getByText('Money account')).toBeDefined();
  });
});
