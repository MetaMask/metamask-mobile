import React from 'react';
import { render } from '@testing-library/react-native';
import ApprovalResult, { ApprovalResultType } from './ApprovalResult';

describe('ApprovalResult', () => {
  const mockProps = {
    requestData: {
      message: 'Success message',
    },
    onConfirm: jest.fn(),
    requestType: ApprovalResultType.Success,
  };

  it('renders approval result with success type', () => {
    const wrapper = render(<ApprovalResult {...mockProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders approval result with error type', () => {
    const errorMockProps = {
      ...mockProps,
      requestData: {
        error: 'Error message',
      },
      requestType: ApprovalResultType.Failure,
    };

    const wrapper = render(<ApprovalResult {...errorMockProps} />);

    expect(wrapper).toMatchSnapshot();
  });
});
