import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../locales/i18n';
import { ResetAccountModal } from './ResetAccountModal';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectChainId } from '../../../../../selectors/networkController';
import { wipeTransactions } from '../../../../../util/transaction-controller';
import { wipeSmartTransactions } from '../../../../../util/smart-transactions';
import { wipeBridgeStatus } from '../../../../UI/Bridge/utils';

jest.mock('../../../../../selectors/accountsController', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/accountsController',
  );
  return {
    ...actual,
    selectSelectedInternalAccountFormattedAddress: jest.fn(
      actual.selectSelectedInternalAccountFormattedAddress,
    ),
  };
});

jest.mock('../../../../../selectors/networkController', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/networkController',
  );
  return {
    ...actual,
    selectChainId: jest.fn(actual.selectChainId),
  };
});

jest.mock('../../../../../util/transaction-controller', () => ({
  wipeTransactions: jest.fn(),
}));

jest.mock('../../../../../util/smart-transactions', () => ({
  wipeSmartTransactions: jest.fn(),
}));

jest.mock('../../../../UI/Bridge/utils', () => ({
  wipeBridgeStatus: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('ResetAccountModal', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  const defaultProps = {
    resetModalVisible: true,
    cancelResetAccount: jest.fn(),
    styles: {
      modalView: {},
      modalTitle: {},
      modalText: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectSelectedInternalAccountFormattedAddress as unknown as jest.Mock
    ).mockReturnValue('0x123456789abcdef123456789abcdef123456789a');
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');
  });

  it('calls wipeBridgeStatus, wipeTransactions, and wipeSmartTransactions when reset button is pressed', () => {
    const { getByText } = renderWithProvider(
      <ResetAccountModal {...defaultProps} />,
      { state: initialState },
    );

    const confirmButton = getByText(
      strings('app_settings.reset_account_confirm_button'),
    );
    fireEvent.press(confirmButton);

    expect(wipeBridgeStatus).toHaveBeenCalledWith(
      '0x123456789abcdef123456789abcdef123456789a',
      '0x1',
    );
    expect(wipeTransactions).toHaveBeenCalledWith();
    expect(wipeSmartTransactions).toHaveBeenCalledWith(
      '0x123456789abcdef123456789abcdef123456789a',
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  it('does not call wipeBridgeStatus when selectedAddress is falsy', () => {
    (
      selectSelectedInternalAccountFormattedAddress as unknown as jest.Mock
    ).mockReturnValue(undefined);

    const { getByText } = renderWithProvider(
      <ResetAccountModal {...defaultProps} />,
      { state: initialState },
    );

    const confirmButton = getByText(
      strings('app_settings.reset_account_confirm_button'),
    );
    fireEvent.press(confirmButton);

    expect(wipeBridgeStatus).not.toHaveBeenCalled();
    expect(wipeTransactions).toHaveBeenCalledWith();
    expect(wipeSmartTransactions).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });
});
