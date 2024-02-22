import React from 'react';
import { render } from '@testing-library/react-native';
import ApprovalFlowLoader from '.';

describe('ApprovalFlowLoader', () => {
  it('should render correctly', () => {
    const wrapper = render(<ApprovalFlowLoader />);
    expect(wrapper).toMatchSnapshot();
  });
});
