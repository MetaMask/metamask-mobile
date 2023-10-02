// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellMultiSelect from './CellMultiSelect';
import {
  CELLMULTISELECT_TEST_ID,
  SAMPLE_CELLMULTISELECT_PROPS,
} from './CellMultiSelect.constants';

describe('CellMultiSelect - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellMultiSelect {...SAMPLE_CELLMULTISELECT_PROPS} onPress={jest.fn} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellMultiSelect
        {...SAMPLE_CELLMULTISELECT_PROPS}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellMultiSelect', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellMultiSelect {...SAMPLE_CELLMULTISELECT_PROPS} onPress={jest.fn} />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLMULTISELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
