import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../Earn/constants/musd';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import {
  selectMoneyShowMoneyAccountAddress,
  selectMoneyAccountVaultConfig,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetChainIdForBuyFlow = jest.fn();
const mockGoToBuy = jest.fn();
const mockInitiateDeposit = jest.fn(() => Promise.resolve());

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../Earn/hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: jest.fn(),
}));

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

// Selectors added by the "show money account address" feature — mock them so
// the test store doesn't need a fully-hydrated engine.backgroundState.
jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyShowMoneyAccountAddress: jest.fn(),
    selectMoneyAccountVaultConfig: jest.fn(),
  }),
);

// Preserve all real networkController exports so downstream selectors that
// run at module init time (e.g. multichainAccounts) still get valid functions;
// only override selectNetworkConfigurations to avoid touching engine state.
jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurations: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyAddMoneySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetChainIdForBuyFlow.mockReturnValue(MUSD_CONVERSION_DEFAULT_CHAIN_ID);

    (useMusdConversionFlowData as jest.Mock).mockReturnValue({
      getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
    });
    (useRampNavigation as jest.Mock).mockReturnValue({
      goToBuy: mockGoToBuy,
    });
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatFormatted: '$1,203.89',
    });
    (useMoneyAccountDeposit as jest.Mock).mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });

    // Feature flag off by default → shows "Coming soon" for the receive row.
    (selectMoneyShowMoneyAccountAddress as jest.Mock).mockReturnValue(false);
    (selectMoneyAccountVaultConfig as jest.Mock).mockReturnValue(undefined);
    // No money account address → address UI is hidden.
    (selectPrimaryMoneyAccount as jest.Mock).mockReturnValue(undefined);
    // Network configurations not needed when vaultConfig is undefined.
    (selectNetworkConfigurations as jest.Mock).mockReturnValue({});
  });

  it('renders all four options', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Deposit funds')).toBeOnTheScreen();
    expect(getByText('Transfer your $1,203.89 mUSD')).toBeOnTheScreen();
    expect(getByText('Receive from external wallet')).toBeOnTheScreen();
    expect(getByText('Coming soon')).toBeOnTheScreen();
    expect(
      getByTestId(MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW),
    ).toBeOnTheScreen();
  });

  it('renders the "Add funds" title', () => {
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Add funds')).toBeOnTheScreen();
  });

  it('renders a description under the Convert crypto row', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_DESCRIPTION),
    ).toBeOnTheScreen();
    expect(getByText('From any account')).toBeOnTheScreen();
  });

  it('renders a description under the Deposit funds row', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_DESCRIPTION),
    ).toBeOnTheScreen();
    expect(getByText('From debit card or bank')).toBeOnTheScreen();
  });

  it('preserves the locale fiat prefix in the Move mUSD row', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatFormatted: 'CA$1,500.00',
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Transfer your CA$1,500.00 mUSD')).toBeOnTheScreen();
  });

  it('falls back to the no-amount copy when the mUSD balance is unavailable', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatFormatted: undefined,
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Transfer your mUSD')).toBeOnTheScreen();
  });

  it('navigates to the Ramps buy flow with mUSD pre-selected when Deposit funds is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
    });
  });

  it('initiates a deposit when Convert crypto is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith();
  });

  it('closes the sheet when Move mUSD is pressed (interim, no flow wired yet)', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoToBuy).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });
});
