import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ApprovalFlowResult from './ApprovalFlowResult';

describe('ApprovalFlowResult', () => {
  const mockProps = {
    requestData: {
      data: {
        message: 'Success message',
      },
    },
    onConfirm: jest.fn(),
    requestType: 'result_success',
  };

  it('renders approval flow result with success type and confirms', () => {
    const { getByTestId, getByText } = render(
      <ApprovalFlowResult {...mockProps} />,
    );

    expect(getByTestId('approval-flow-result')).toBeTruthy();
    expect(getByText('Success')).toBeTruthy();
    expect(getByText(mockProps.requestData.data.message)).toBeTruthy();
    fireEvent.press(getByText('OK'));

    expect(mockProps.onConfirm).toHaveBeenCalled();
  });

  it('renders approval flow result with error type and confirms', () => {
    const errorMockProps = {
      ...mockProps,
      requestData: {
        data: {
          error: 'Error message',
        },
      },
      requestType: 'result_error',
    };

    const { getByTestId, getByText } = render(
      <ApprovalFlowResult {...errorMockProps} />,
    );

    expect(getByTestId('approval-flow-result')).toBeTruthy();
    expect(getByText('Error')).toBeTruthy();
    expect(getByText(errorMockProps.requestData.data.error)).toBeTruthy();
    fireEvent.press(getByText('OK'));

    expect(mockProps.onConfirm).toHaveBeenCalled();
  });
});
