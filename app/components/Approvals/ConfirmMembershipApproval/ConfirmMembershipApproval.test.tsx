import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import useApprovalRequest, {
  ApprovalRequestType,
} from '../../Views/confirmations/hooks/useApprovalRequest';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { strings } from '../../../../locales/i18n';
import { ConfirmMembershipApprovalTestIds } from './ConfirmMembershipApproval.testIds';
import ConfirmMembershipApproval from './ConfirmMembershipApproval';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');
jest.mock('../../UI/Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => ({ totalFiatFormatted: undefined }),
}));

const mockOnConfirm = jest.fn();
const mockOnReject = jest.fn();

const createApprovalRequest = (
  overrides: Partial<ApprovalRequestType> = {},
): ApprovalRequestType => ({
  id: 'test-id',
  origin: 'metamask',
  time: Date.now(),
  type: ApprovalTypes.CONFIRM_MEMBERSHIP,
  requestData: {
    monthlyAmount: '9.99',
    totalAmount: '9.99',
    renewDate: 'Nov 5, 2026',
  },
  requestState: null,
  expectsResult: false,
  ...overrides,
});

const mockApprovalRequest = (approvalRequest?: ApprovalRequestType) => {
  jest.mocked(useApprovalRequest).mockReturnValue({
    approvalRequest,
    pageMeta: {},
    onConfirm: mockOnConfirm,
    onReject: mockOnReject,
  });
};

const renderComponent = () =>
  renderWithProvider(<ConfirmMembershipApproval />, {
    state: { engine: { backgroundState } },
  });

describe('ConfirmMembershipApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there is no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderComponent();

    expect(toJSON()).toBeNull();
  });

  it('renders nothing for a different approval type', () => {
    mockApprovalRequest(
      createApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN }),
    );

    const { toJSON } = renderComponent();

    expect(toJSON()).toBeNull();
  });

  it('renders the confirm button for a confirm_membership approval request', () => {
    mockApprovalRequest(createApprovalRequest());

    const { getByTestId } = renderComponent();

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    mockApprovalRequest(createApprovalRequest());

    const { getByTestId } = renderComponent();
    fireEvent.press(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not call onReject when the confirm button is pressed', () => {
    mockApprovalRequest(createApprovalRequest());

    const { getByTestId } = renderComponent();
    fireEvent.press(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    );

    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('calls onReject but not onConfirm when the close button is pressed', () => {
    mockApprovalRequest(createApprovalRequest());

    const { getByTestId } = renderComponent();
    fireEvent.press(
      getByTestId(ConfirmMembershipApprovalTestIds.CLOSE_BUTTON),
    );

    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('passes trial requestData through to the trial confirm button and billed-on row', () => {
    mockApprovalRequest(
      createApprovalRequest({
        requestData: {
          monthlyAmount: '4.99',
          totalAmount: '49.99',
          renewDate: 'Nov 5, 2026',
          isTrial: true,
          billedOn: '05.10.2026',
        },
      }),
    );

    const { getByTestId } = renderComponent();

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('confirm_membership.start_trial'));
    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.BILLED_ON_ROW),
    ).toHaveTextContent('05.10.2026', { exact: false });
  });
});
