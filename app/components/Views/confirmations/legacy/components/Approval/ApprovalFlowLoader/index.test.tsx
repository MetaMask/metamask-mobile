import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ApprovalFlowLoader from '.';

describe('ApprovalFlowLoader', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(<ApprovalFlowLoader />);
    expect(component).toMatchSnapshot();
  });
});
