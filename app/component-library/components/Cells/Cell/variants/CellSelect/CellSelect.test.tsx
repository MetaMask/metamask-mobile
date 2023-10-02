// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellSelect from './CellSelect';
import {
  CELLSELECT_TEST_ID,
  SAMPLE_CELLSELECT_PROPS,
} from './CellSelect.constants';

describe('CellSelect - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellSelect {...SAMPLE_CELLSELECT_PROPS} onPress={jest.fn} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellSelect {...SAMPLE_CELLSELECT_PROPS} isSelected onPress={jest.fn} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellSelect', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellSelect {...SAMPLE_CELLSELECT_PROPS} onPress={jest.fn} />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLSELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
