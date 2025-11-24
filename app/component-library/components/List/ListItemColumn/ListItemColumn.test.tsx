// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemColumn from './ListItemColumn';
import {
  DEFAULT_LISTITEMCOLUMN_WIDTHTYPE,
  TESTID_LISTITEMCOLUMN,
} from './ListItemColumn.constants';
import { WidthType } from './ListItemColumn.types';

describe('ListItemColumn', () => {
  it('should render snapshot correctly', () => {
    const wrapper = shallow(
      <ListItemColumn>
        <View />
      </ListItemColumn>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render component correctly', () => {
    const wrapper = shallow(
      <ListItemColumn>
        <View />
      </ListItemColumn>,
    );
    const listItemColumnComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEMCOLUMN,
    );
    expect(listItemColumnComponent.exists()).toBe(true);
  });

  it('should render the correct default widthType', () => {
    const wrapper = shallow(
      <ListItemColumn widthType={DEFAULT_LISTITEMCOLUMN_WIDTHTYPE}>
        <View />
      </ListItemColumn>,
    );
    const listItemColumnComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEMCOLUMN,
    );
    expect(listItemColumnComponent.props().style.flex).toBe(-1);
  });

  it('should render the given widthType', () => {
    const wrapper = shallow(
      <ListItemColumn widthType={WidthType.Fill}>
        <View />
      </ListItemColumn>,
    );
    const listItemColumnComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEMCOLUMN,
    );
    expect(listItemColumnComponent.props().style.flex).toBe(1);
  });
});
