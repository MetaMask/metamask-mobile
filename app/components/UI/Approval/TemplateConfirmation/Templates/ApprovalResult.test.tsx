import React from 'react';
import { render } from '@testing-library/react-native';
import TemplateConfirmation, {
  TemplateConfirmationProps,
} from '../TemplateConfirmation';
import { ApprovalTypes } from '../../../../../core/RPCMethods/RPCMethodMiddleware';

describe('ApprovalResult', () => {
  const mockProps: TemplateConfirmationProps = {
    approvalRequest: {
      id: 'mocked',
      origin: 'metamask',
      requestData: {
        message: 'Success message',
      },
      type: ApprovalTypes.RESULT_SUCCESS,
      expectsResult: false,
      requestState: null,
      time: 123456,
    },
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders approval result with success type', () => {
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders approval result with error type', () => {
    const errorMockProps: TemplateConfirmationProps = {
      approvalRequest: {
        ...mockProps.approvalRequest,
        requestData: {
          error: 'Error message',
        },
        type: ApprovalTypes.RESULT_ERROR,
      },
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };

    const wrapper = render(<TemplateConfirmation {...errorMockProps} />);

    expect(wrapper).toMatchSnapshot();
  });
});
