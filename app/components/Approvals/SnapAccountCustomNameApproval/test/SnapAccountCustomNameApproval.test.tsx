import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL,
  SNAP_ACCOUNT_CUSTOM_NAME_CANCEL_BUTTON,
  SNAP_ACCOUNT_CUSTOM_NAME_INPUT,
  SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON,
} from '../SnapAccountCustomNameApproval.constants';
import { ApprovalRequest } from '@metamask/approval-controller';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import SnapAccountCustomNameApproval from '../SnapAccountCustomNameApproval';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { RootState } from '../../../../reducers';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../../util/test/accountsControllerTestUtils';

jest.mock('../../../Views/confirmations/hooks/useApprovalRequest');

jest.mock('../../../../core/Engine', () => {
  const { MOCK_ADDRESS_1: mockAddress1 } = jest.requireActual(
    '../../../../util/test/accountsControllerTestUtils',
  );
  return {
    context: {
      AccountsController: {
        getNextAvailableAccountName: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: [mockAddress1],
            },
          ],
        },
      },
    },
  };
});

const onConfirm = jest.fn();
const onReject = jest.fn();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm,
    onReject,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('SnapAccountCustomNameApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        AccountsController: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
        KeyringController: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
    },
  };

  it('renders correctly when approvalRequest is for showNameSnapAccount', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {
        snapSuggestedAccountName: 'New Account',
      },
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const approvalModal = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL);
    expect(approvalModal).toBeDefined();
  });

  it('initializes accountName with snapSuggestedAccountName when provided and name is not taken', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {
        snapSuggestedAccountName: 'Unique Account',
      },
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const input = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_INPUT);
    expect(input.props.value).toBe('Unique Account');
  });

  it('increments suffix when snapSuggestedAccountName is taken', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {
        snapSuggestedAccountName: 'Account 1',
      },
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const input = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_INPUT);
    expect(input.props.value).toBe('Account 1 2');
  });

  it('initializes accountName with next available account name when snapSuggestedAccountName is not provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {},
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const input = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_INPUT);
    expect(input.props.value).toBe('');
  });

  it('shows error message and disables "Add Account" button when name is taken', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {
        snapSuggestedAccountName: 'Unique Account',
      },
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId, getByText } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const input = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_INPUT);
    fireEvent.changeText(input, 'Account 2');

    // Check that error message is displayed
    expect(getByText('This account name already exists')).toBeDefined();

    const addButton = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON);
    expect(addButton.props.disabled).toBe(true);
  });

  it('calls onConfirm with account name when "Add Account" button is pressed and name is not taken', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {
        snapSuggestedAccountName: 'Unique Account',
      },
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const addButton = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON);
    fireEvent.press(addButton);

    expect(onConfirm).toHaveBeenCalledWith(undefined, {
      success: true,
      name: 'Unique Account',
    });
  });

  it('calls onReject when "Cancel" button is pressed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
      requestData: {
        snapSuggestedAccountName: 'Unique Account',
      },
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { getByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const cancelButton = getByTestId(SNAP_ACCOUNT_CUSTOM_NAME_CANCEL_BUTTON);
    fireEvent.press(cancelButton);

    expect(onReject).toHaveBeenCalled();
  });

  it('does not render when approvalRequest type is not showNameSnapAccount', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApprovalRequestData: ApprovalRequest<any> = {
      id: '1',
      origin: 'metamask',
      time: Date.now(),
      type: 'some_other_type',
      requestData: {},
      requestState: null,
      expectsResult: false,
    };
    mockApprovalRequest(mockApprovalRequestData);

    const { queryByTestId } = renderWithProvider(
      <SnapAccountCustomNameApproval />,
      { state: initialState },
    );

    const approvalModal = queryByTestId(SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL);
    expect(approvalModal).toBeNull();
  });
});
