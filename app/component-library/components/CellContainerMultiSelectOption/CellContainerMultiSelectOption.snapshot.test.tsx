// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies
import CellContainerMultiSelectOption from './CellContainerMultiSelectOption';

describe('CellContainerMultiSelectOption', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectOption isSelected={false}>
        <View />
      </CellContainerMultiSelectOption>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper select state when isSelected is true', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectOption isSelected={true}>
        <View />
      </CellContainerMultiSelectOption>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
