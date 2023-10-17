import React from 'react';
import { shallow } from 'enzyme';
import Confetti from './';

describe('Confetti', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Confetti />);
    expect(wrapper).toMatchSnapshot();
  });
});
