import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import {
  TransactionApproval,
  TransactionModalType,
} from './TransactionApproval';

jest.mock('../../hooks/useApprovalRequest');

jest.mock('../../UI/QRHardware/withQRHardwareAwareness', () =>
  jest.fn((component) => component),
);

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
  } as any);
};

describe('TransactionApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders approval component if transaction type is dapp', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
    } as any);

    const wrapper = shallow(
      <TransactionApproval transactionType={TransactionModalType.Dapp} />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders approve component if transaction type is transaction', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
    } as any);

    const wrapper = shallow(
      <TransactionApproval
        transactionType={TransactionModalType.Transaction}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders QR signing modal if signing QR object', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
    } as any);

    const wrapper = shallow(
      <TransactionApproval isSigningQRObject QRState={{ test: 'value' }} />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<TransactionApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
    } as any);

    const wrapper = shallow(<TransactionApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if incorrect transaction type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
    } as any);

    const wrapper = shallow(<TransactionApproval transactionType="invalid" />);

    expect(wrapper).toMatchSnapshot();
  });
});
