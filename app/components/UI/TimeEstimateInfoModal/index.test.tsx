import React from 'react';
import { shallow } from 'enzyme';
import TimeEstimateInfoModal from './';

describe('TimeEstimateInfoModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TimeEstimateInfoModal timeEstimateId={'medium'} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
