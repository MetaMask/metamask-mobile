import React from 'react';
import { render } from '@testing-library/react-native';
import Confirmation from '../Confirmation';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';

describe('ApprovalResult', () => {
  const mockProps = {
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
  };

  it('renders approval result with success type', () => {
    const wrapper = render(<Confirmation {...mockProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders approval result with error type', () => {
    const errorMockProps = {
      approvalRequest: {
        ...mockProps.approvalRequest,
        requestData: {
          error: 'Error message',
        },
        type: ApprovalTypes.RESULT_ERROR,
      },
      onConfirm: jest.fn(),
    };

    const wrapper = render(<Confirmation {...errorMockProps} />);

    expect(wrapper).toMatchSnapshot();
  });
});
