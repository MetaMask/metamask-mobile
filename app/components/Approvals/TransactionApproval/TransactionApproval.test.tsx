import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { render } from '@testing-library/react-native';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import {
  TransactionApproval,
  TransactionModalType,
} from './TransactionApproval';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

jest.mock('../../UI/QRHardware/withQRHardwareAwareness', () =>
  jest.fn((component) => component),
);

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('TransactionApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders approval component if transaction type is dapp', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(
      <TransactionApproval transactionType={TransactionModalType.Dapp} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders approve component if transaction type is transaction', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(
      <TransactionApproval
        transactionType={TransactionModalType.Transaction}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders QR signing modal if signing QR object', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(
      <TransactionApproval isSigningQRObject QRState={{ test: 'value' }} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = render(<TransactionApproval />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(<TransactionApproval />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if incorrect transaction type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = render(<TransactionApproval transactionType="invalid" />);

    expect(toJSON()).toMatchSnapshot();
  });
});
