import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { render } from '@testing-library/react-native';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import {
  ApprovalFlowState,
  ApprovalRequest,
} from '@metamask/approval-controller';
import FlowLoaderModal from './FlowLoaderModal';
import useApprovalFlow from '../../Views/confirmations/hooks/useApprovalFlow';
import { ThemeContext, mockTheme } from '../../../util/theme';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');
jest.mock('../../Views/confirmations/hooks/useApprovalFlow');
jest.mock('../../UI/AnimatedSpinner', () => 'AnimatedSpinner');
jest.mock('react-native-modal', () => {
  const React = require('react');
  return ({ children, isVisible }: { children: React.ReactNode; isVisible: boolean }) =>
    isVisible ? <>{children}</> : null;
});

const APPROVAL_FLOW_MOCK: ApprovalFlowState = {
  id: 'testId1',
  loadingText: 'testLoadingText',
};

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

const mockApprovalFlow = (approvalFlow?: ApprovalFlowState) => {
  (useApprovalFlow as jest.MockedFn<typeof useApprovalFlow>).mockReturnValue({
    approvalFlow,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('FlowLoaderModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalFlow(APPROVAL_FLOW_MOCK);
    mockApprovalRequest(undefined);

    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <FlowLoaderModal />
      </ThemeContext.Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no approval flow', () => {
    mockApprovalFlow(undefined);
    mockApprovalRequest(undefined);

    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <FlowLoaderModal />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if approval request', () => {
    mockApprovalFlow(APPROVAL_FLOW_MOCK);
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.CONNECT_ACCOUNTS } as any);

    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <FlowLoaderModal />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
