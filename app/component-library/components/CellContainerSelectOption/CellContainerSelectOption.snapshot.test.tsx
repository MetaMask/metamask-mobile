// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies
import CellContainerSelectOption from './CellContainerSelectOption';

describe('CellContainerSelectOption', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellContainerSelectOption isSelected={false}>
        <View />
      </CellContainerSelectOption>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper select state when isSelected is true', () => {
    const wrapper = shallow(
      <CellContainerSelectOption isSelected={true}>
        <View />
      </CellContainerSelectOption>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
