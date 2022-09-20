// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import AccordionHeader from './AccordionHeader';

describe('AccordionHeader - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AccordionHeader title="Sample Title" />);
    expect(wrapper).toMatchSnapshot();
  });
});
