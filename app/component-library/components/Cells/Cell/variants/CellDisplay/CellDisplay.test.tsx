// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import {
  CELLDISPLAY_TEST_ID,
  SAMPLE_CELLDISPLAY_PROPS,
} from './CellDisplay.constants';

describe('CellDisplay - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<CellDisplay {...SAMPLE_CELLDISPLAY_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellDisplay', () => {
  it('should render CellDisplay', () => {
    const wrapper = shallow(<CellDisplay {...SAMPLE_CELLDISPLAY_PROPS} />);
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLDISPLAY_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
