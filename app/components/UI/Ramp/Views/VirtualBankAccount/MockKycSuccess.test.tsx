import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MockKycSuccess from './MockKycSuccess';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';
import { __resetRegisterSelectedMoneyAccountWalletForTests } from './registerSelectedMoneyAccountWallet';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetSessionProfileId = jest.fn();
const mockGetCustomerByExternalId = jest.fn();
const mockRegisterMoneyAccountWallet = jest.fn();
const mockCreateAutoramp = jest.fn();
const mockSocketConnect = jest.fn();
const mockSocketDisconnect = jest.fn();
const mockSocketAddListener = jest.fn();

const SELECTED_ADDRESS = '0x1111111111111111111111111111111111111111';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock(
  '../../../../../util/notifications/utils/get-session-profile-id',
  () => ({
    getSessionProfileId: (...args: unknown[]) =>
      mockGetSessionProfileId(...args),
  }),
);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NeoBankService: {
      getCustomerByExternalId: (...args: unknown[]) =>
        mockGetCustomerByExternalId(...args),
    },
    RampsController: {
      registerMoneyAccountWallet: (...args: unknown[]) =>
        mockRegisterMoneyAccountWallet(...args),
      createAutoramp: (...args: unknown[]) => mockCreateAutoramp(...args),
    },
  },
}));

jest.mock('./neobank/NeobankWebSocket', () => ({
  NeobankWebSocket: {
    getInstance: () => ({
      connect: mockSocketConnect,
      disconnect: mockSocketDisconnect,
      addListener: mockSocketAddListener,
    }),
  },
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectSelectedInternalAccountAddress: () => SELECTED_ADDRESS,
}));

describe('MockKycSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRegisterSelectedMoneyAccountWalletForTests();
    mockGetSessionProfileId.mockResolvedValue('profile-1234567890abcd');
    mockGetCustomerByExternalId.mockResolvedValue({
      id: 'customer-abcdef123456',
      status: 'Active',
    });
    mockRegisterMoneyAccountWallet.mockResolvedValue({
      type: 'registered',
      registration: {
        id: 'reg-1',
        address: SELECTED_ADDRESS,
        blockchain: 'Monad',
      },
    });
    mockCreateAutoramp.mockResolvedValue({
      id: 'autoramp-xyz789abc',
      status: 'pending',
    });
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders the signing step before autoramp creation', () => {
    const { getByText } = renderWithProvider(<MockKycSuccess />);

    expect(getByText('Sign wallet ownership')).toBeTruthy();
    expect(getByText('Create the autoramp')).toBeTruthy();
    expect(getByText(/five real steps/)).toBeTruthy();
  });

  it('signs wallet ownership before creating the autoramp', async () => {
    const callOrder: string[] = [];
    mockRegisterMoneyAccountWallet.mockImplementation(async () => {
      callOrder.push('register');
      return {
        type: 'registered',
        registration: {
          id: 'reg-1',
          address: SELECTED_ADDRESS,
          blockchain: 'Monad',
        },
      };
    });
    mockCreateAutoramp.mockImplementation(async () => {
      callOrder.push('autoramp');
      return { id: 'autoramp-xyz789abc', status: 'pending' };
    });

    const { getByTestId, getByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    await waitFor(() => {
      expect(mockCreateAutoramp).toHaveBeenCalled();
    });

    expect(mockRegisterMoneyAccountWallet).toHaveBeenCalledWith({
      address: SELECTED_ADDRESS,
    });
    expect(callOrder).toEqual(['register', 'autoramp']);
    expect(getByText(/registered · chain = Monad/)).toBeTruthy();
  });

  it('stops before autoramp creation when wallet signing fails', async () => {
    mockRegisterMoneyAccountWallet.mockRejectedValue(
      new Error('User rejected the request'),
    );

    const { getByTestId, getByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    await waitFor(() => {
      expect(getByText('User rejected the request')).toBeTruthy();
    });

    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    expect(getByText('Pipeline stopped')).toBeTruthy();
  });
});
