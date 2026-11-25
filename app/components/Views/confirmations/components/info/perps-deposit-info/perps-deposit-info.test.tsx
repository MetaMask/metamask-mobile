import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { ARBITRUM_USDC, PERPS_CURRENCY } from '../../../constants/perps';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useDefaultPaySelectedSection } from '../../../hooks/pay/useDefaultPaySelectedSection';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { PayWithOption } from '../../confirm/confirm-component';
import { CustomAmountInfo } from '../custom-amount-info';
import { PerpsDepositInfo } from './perps-deposit-info';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

jest.mock('../../../hooks/ui/useNavbar');
jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../../../hooks/pay/useDefaultPaySelectedSection');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));
jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
}));

describe('PerpsDepositInfo', () => {
  const mockUseNavbar = jest.mocked(useNavbar);
  const mockUseAddToken = jest.mocked(useAddToken);
  const mockUseParams = jest.mocked(useParams);
  const mockCustomAmountInfo = jest.mocked(CustomAmountInfo);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.perpsLighterDeposit,
      txParams: { from: '0x123', to: '0x123' },
    } as never);
  });

  it('sets navbar title to default perps deposit title', () => {
    render(<PerpsDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith(
      strings('confirm.title.perps_deposit'),
    );
  });

  it('sets navbar title to "Send to Perps" when payWithOption is MoneyAccount', () => {
    mockUseParams.mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });

    render(<PerpsDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith(strings('perps.send_to_perps'));
  });

  it('registers Arbitrum USDC token', () => {
    render(<PerpsDepositInfo />);

    expect(mockUseAddToken).toHaveBeenCalledWith({
      chainId: CHAIN_IDS.ARBITRUM,
      decimals: ARBITRUM_USDC.decimals,
      name: ARBITRUM_USDC.name,
      symbol: ARBITRUM_USDC.symbol,
      tokenAddress: ARBITRUM_USDC.address,
    });
  });

  it('renders CustomAmountInfo with perps currency', () => {
    render(<PerpsDepositInfo />);

    expect(mockCustomAmountInfo).toHaveBeenCalledWith(
      expect.objectContaining({ currency: PERPS_CURRENCY }),
      undefined,
    );
  });

  it('calls useDefaultPaySelectedSection', () => {
    render(<PerpsDepositInfo />);

    expect(useDefaultPaySelectedSection).toHaveBeenCalled();
  });

  describe('hasMax prop', () => {
    const LIGHTER_DEPOSIT_DATA = '0x8a857083';

    it('passes hasMax:false for the first deposit into Lighter (with approval)', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: '0x123' },
        nestedTransactions: [
          { to: '0xusdc', data: '0x095ea7b3' },
          { to: '0xlighter', data: LIGHTER_DEPOSIT_DATA },
        ],
      } as never);

      render(<PerpsDepositInfo />);

      expect(mockCustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({ hasMax: false }),
        undefined,
      );
    });

    it('passes hasMax:false for the first deposit into Lighter (direct deposit)', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: '0x123' },
        nestedTransactions: [{ to: '0xlighter', data: LIGHTER_DEPOSIT_DATA }],
      } as never);

      render(<PerpsDepositInfo />);

      expect(mockCustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({ hasMax: false }),
        undefined,
      );
    });

    it('passes hasMax:true for a deposit into an existing Lighter account', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: '0x123', to: '0x123' },
      } as never);

      render(<PerpsDepositInfo />);

      expect(mockCustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({ hasMax: true }),
        undefined,
      );
    });
  });
});
