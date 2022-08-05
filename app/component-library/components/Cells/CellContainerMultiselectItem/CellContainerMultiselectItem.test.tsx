// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellContainerMultiselectItem from './CellContainerMultiselectItem';

describe('CellContainerMultiselectItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CellContainerMultiselectItem isSelected>
        <View />
      </CellContainerMultiselectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be checked when selected', () => {
    const wrapper = shallow(
      <CellContainerMultiselectItem isSelected>
        <View />
      </CellContainerMultiselectItem>,
    );
    const checkboxComponent = wrapper.childAt(0);
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(true);
  });

  it('should not be checked when not selected', () => {
    const wrapper = shallow(
      <CellContainerMultiselectItem isSelected={false}>
        <View />
      </CellContainerMultiselectItem>,
    );
    const checkboxComponent = wrapper.childAt(0);
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(false);
  });
});
