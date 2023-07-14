import React from 'react';
import { shallow } from 'enzyme';
import ApprovalFlowLoader from '.';

describe('ApprovalFlowLoader', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ApprovalFlowLoader />);
    expect(wrapper).toMatchSnapshot();
  });
});
