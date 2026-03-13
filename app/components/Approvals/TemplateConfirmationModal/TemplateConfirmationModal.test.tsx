import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { render } from '@testing-library/react-native';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import TemplateConfirmationModal from './TemplateConfirmationModal';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('TemplateConfirmationModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders if approval type is success result', () => {
    mockApprovalRequest({
      type: ApprovalTypes.RESULT_SUCCESS,
      requestData: {
        test: 'value',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(<TemplateConfirmationModal />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders if approval type is error result', () => {
    mockApprovalRequest({
      type: ApprovalTypes.RESULT_ERROR,
      requestData: {
        test: 'value',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(<TemplateConfirmationModal />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders nothing if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = render(<TemplateConfirmationModal />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders nothing if incorrect approval request type', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const { toJSON } = render(<TemplateConfirmationModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
