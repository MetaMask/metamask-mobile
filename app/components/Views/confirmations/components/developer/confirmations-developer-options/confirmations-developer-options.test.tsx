import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { fireEvent, act, render } from '@testing-library/react-native';
import React from 'react';
import { useTheme } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { selectDefaultEndpointByChainId } from '../../../../../../selectors/networkController';
import { addTransactionBatch } from '../../../../../../util/transaction-controller';
import { generateTransferData } from '../../../../../../util/transactions';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import { useConfirmNavigation } from '../../../hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../confirm/confirm-component';
import { ConfirmationsDeveloperOptions } from './confirmations-developer-options';
import { ConfirmationsDeveloperOptionsTestIds } from './confirmations-developer-options.testIds';
import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
} from '../../../../../../selectors/featureFlagController/moneyAccount';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: jest.fn(),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../../selectors/accountsController'),
  selectSelectedInternalAccountAddress: jest.fn(),
}));

jest.mock('../../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../../selectors/networkController'),
  selectDefaultEndpointByChainId: jest.fn(),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  addTransactionBatch: jest.fn(),
}));

jest.mock('../../../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

jest.mock('../../../hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

jest.mock(
  '../../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyAccountDepositEnabledFlag: jest.fn(),
    selectMoneyAccountWithdrawEnabledFlag: jest.fn(),
  }),
);

const MOCK_ACCOUNT = '0x1234567890123456789012345678901234567890' as Hex;
const MOCK_TRANSFER_DATA = '0xabcdef' as Hex;
const MOCK_ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex;
const MOCK_POLYGON_USDCE = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex;
const MOCK_PROXY_ADDRESS = '0x13032833b30f3388208cda38971fdc839936b042' as Hex;
const MOCK_NETWORK_CLIENT_ID = 'arbitrum-mainnet';
const mockNavigateToConfirmation = jest.fn();
const mockSelectMoneyAccountDepositEnabledFlag = jest.mocked(
  selectMoneyAccountDepositEnabledFlag,
);
const mockSelectMoneyAccountWithdrawEnabledFlag = jest.mocked(
  selectMoneyAccountWithdrawEnabledFlag,
);

describe('ConfirmationsDeveloperOptions', () => {
  const mockUseSelector = jest.mocked(useSelector);
  const mockUseTheme = jest.mocked(useTheme);
  const mockUseStyles = jest.mocked(useStyles);
  const mockSelectSelectedInternalAccountAddress = jest.mocked(
    selectSelectedInternalAccountAddress,
  );
  const mockSelectDefaultEndpointByChainId = jest.mocked(
    selectDefaultEndpointByChainId,
  );
  const mockAddTransactionBatch = jest.mocked(addTransactionBatch);
  const mockGenerateTransferData = jest.mocked(generateTransferData);
  const mockUseConfirmNavigation = jest.mocked(useConfirmNavigation);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTheme.mockReturnValue({
      colors: {},
    } as never);

    mockUseStyles.mockReturnValue({
      styles: {
        accessory: {},
        desc: {},
        heading: {},
      },
    } as never);

    mockSelectSelectedInternalAccountAddress.mockReturnValue(MOCK_ACCOUNT);
    mockSelectDefaultEndpointByChainId.mockReturnValue({
      networkClientId: MOCK_NETWORK_CLIENT_ID,
    } as never);
    mockGenerateTransferData.mockReturnValue(MOCK_TRANSFER_DATA);
    mockAddTransactionBatch.mockResolvedValue(undefined as never);
    mockUseConfirmNavigation.mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    } as never);
    mockSelectMoneyAccountDepositEnabledFlag.mockReturnValue(false);
    mockSelectMoneyAccountWithdrawEnabledFlag.mockReturnValue(false);
    mockUseSelector.mockImplementation(((
      selector: (state: object) => unknown,
    ) => selector({})) as typeof useSelector);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the Perps Withdraw developer option', () => {
    const { getByText, getByTestId } = render(
      <ConfirmationsDeveloperOptions />,
    );

    expect(getByText('Perps Withdraw')).toBeOnTheScreen();
    expect(
      getByText('Trigger a Perps withdraw confirmation.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ConfirmationsDeveloperOptionsTestIds.PERPS_WITHDRAW_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates to the Perps confirmation flow when the Perps Withdraw button is pressed', async () => {
    const { getByTestId } = render(<ConfirmationsDeveloperOptions />);

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmationsDeveloperOptionsTestIds.PERPS_WITHDRAW_BUTTON),
      );
    });

    expect(mockGenerateTransferData).toHaveBeenCalledWith('transfer', {
      toAddress: MOCK_ARBITRUM_USDC,
      amount: '0x0',
    });
    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.PERPS.ROOT,
    });
    expect(mockSelectDefaultEndpointByChainId).toHaveBeenCalledWith(
      {},
      CHAIN_IDS.ARBITRUM,
    );
    expect(mockAddTransactionBatch).toHaveBeenCalledWith({
      from: MOCK_ACCOUNT,
      origin: ORIGIN_METAMASK,
      networkClientId: MOCK_NETWORK_CLIENT_ID,
      disableHook: true,
      disableSequential: true,
      transactions: [
        {
          params: {
            to: MOCK_ARBITRUM_USDC,
            data: MOCK_TRANSFER_DATA,
          },
          type: TransactionType.perpsWithdraw,
        },
      ],
    });
  });

  describe('Money Account Deposit', () => {
    it('renders when moneyAccountDepositEnabled flag is true', () => {
      mockSelectMoneyAccountDepositEnabledFlag.mockReturnValue(true);

      const { getByText, getByTestId } = render(
        <ConfirmationsDeveloperOptions />,
      );

      expect(getByText('Money Account Deposit')).toBeOnTheScreen();
      expect(
        getByText('Trigger a Money Account deposit confirmation.'),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('does not render when moneyAccountDepositEnabled flag is false', () => {
      mockSelectMoneyAccountDepositEnabledFlag.mockReturnValue(false);

      const { queryByTestId } = render(<ConfirmationsDeveloperOptions />);

      expect(
        queryByTestId(
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_BUTTON,
        ),
      ).toBeNull();
    });

    it('triggers money account deposit transaction batch on press', async () => {
      mockSelectMoneyAccountDepositEnabledFlag.mockReturnValue(true);

      const { getByTestId } = render(<ConfirmationsDeveloperOptions />);

      await act(async () => {
        fireEvent.press(
          getByTestId(
            ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_BUTTON,
          ),
        );
      });

      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PREDICT.ROOT,
      });
      expect(mockAddTransactionBatch).toHaveBeenCalledWith({
        from: MOCK_ACCOUNT,
        origin: ORIGIN_METAMASK,
        networkClientId: MOCK_NETWORK_CLIENT_ID,
        disableHook: true,
        disableSequential: true,
        transactions: [
          {
            params: {
              to: MOCK_PROXY_ADDRESS,
              value: '0x1',
            },
          },
          {
            params: {
              to: MOCK_POLYGON_USDCE,
              data: MOCK_TRANSFER_DATA,
            },
            type: TransactionType.moneyAccountDeposit,
          },
        ],
      });
    });
  });

  describe('Money Account Withdraw', () => {
    it('renders when moneyAccountWithdrawEnabled flag is true', () => {
      mockSelectMoneyAccountWithdrawEnabledFlag.mockReturnValue(true);

      const { getByText, getByTestId } = render(
        <ConfirmationsDeveloperOptions />,
      );

      expect(getByText('Money Account Withdraw')).toBeOnTheScreen();
      expect(
        getByText('Trigger a Money Account withdraw confirmation.'),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_WITHDRAW_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('does not render when moneyAccountWithdrawEnabled flag is false', () => {
      mockSelectMoneyAccountWithdrawEnabledFlag.mockReturnValue(false);

      const { queryByTestId } = render(<ConfirmationsDeveloperOptions />);

      expect(
        queryByTestId(
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_WITHDRAW_BUTTON,
        ),
      ).toBeNull();
    });

    it('triggers money account withdraw transaction batch on press', async () => {
      mockSelectMoneyAccountWithdrawEnabledFlag.mockReturnValue(true);

      const { getByTestId } = render(<ConfirmationsDeveloperOptions />);

      await act(async () => {
        fireEvent.press(
          getByTestId(
            ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_WITHDRAW_BUTTON,
          ),
        );
      });

      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PREDICT.ROOT,
      });
      expect(mockAddTransactionBatch).toHaveBeenCalledWith({
        from: MOCK_ACCOUNT,
        origin: ORIGIN_METAMASK,
        networkClientId: MOCK_NETWORK_CLIENT_ID,
        disableHook: true,
        disableSequential: true,
        transactions: [
          {
            params: {
              to: MOCK_PROXY_ADDRESS,
              value: '0x1',
            },
          },
          {
            params: {
              to: MOCK_POLYGON_USDCE,
              data: MOCK_TRANSFER_DATA,
            },
            type: TransactionType.moneyAccountWithdraw,
          },
        ],
      });
    });
  });
});
