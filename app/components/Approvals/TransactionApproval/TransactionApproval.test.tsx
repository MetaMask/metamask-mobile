import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import {
  TransactionApproval,
  TransactionModalType,
} from './TransactionApproval';
import { useConfirmationRedesignEnabled } from '../../Views/confirmations/hooks/useConfirmationRedesignEnabled';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock(
  '../../Views/confirmations/hooks/useConfirmationRedesignEnabled',
  () => ({
    useConfirmationRedesignEnabled: jest.fn(),
  }),
);
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
    (
      useConfirmationRedesignEnabled as jest.MockedFn<
        typeof useConfirmationRedesignEnabled
      >
    ).mockReturnValue({
      isRedesignedEnabled: false,
    });
  });

  it('renders approval component if transaction type is dapp', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const wrapper = shallow(
      <TransactionApproval transactionType={TransactionModalType.Dapp} />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders approve component if transaction type is transaction', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const wrapper = shallow(
      <TransactionApproval
        transactionType={TransactionModalType.Transaction}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders QR signing modal if signing QR object is exists', () => {
    mockApprovalRequest({
      type: 'non_existing_type',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const wrapper = shallow(
      <TransactionApproval
        isSigningQRObject
        pendingScanRequest={{ test: 'value' }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<TransactionApproval />, {});

    expect(toJSON()).toMatchInlineSnapshot(`null`);
  });

  it('returns null if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<TransactionApproval />, {});

    expect(toJSON()).toMatchInlineSnapshot(`null`);
  });

  it('returns null if incorrect transaction type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(
      <TransactionApproval transactionType="invalid" />,
      {},
    );

    expect(toJSON()).toMatchInlineSnapshot(`null`);
  });

  it('returns null if redesign is enabled', () => {
    mockApprovalRequest({
      type: ApprovalTypes.TRANSACTION,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    (
      useConfirmationRedesignEnabled as jest.MockedFn<
        typeof useConfirmationRedesignEnabled
      >
    ).mockReturnValue({
      isRedesignedEnabled: true,
    });

    const { toJSON } = renderWithProvider(
      <TransactionApproval transactionType={TransactionModalType.Dapp} />,
      {},
    );

    expect(toJSON()).toMatchInlineSnapshot(`null`);
  });
});
