import React from 'react';
import { shallow } from 'enzyme';
import ModalUseTerms from './ModalUseTerms';

describe('Use Terms Modal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ModalUseTerms onDismiss={() => {}} />);
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
