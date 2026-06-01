import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ApprovalFlowLoader from '.';

describe('ApprovalFlowLoader', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(
      <ApprovalFlowLoader loadingText="Loading..." />,
    );
    expect(getByText('Loading...')).toBeOnTheScreen();
  });
});
