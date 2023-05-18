// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItem from './ListItem';
import {
  DEFAULT_LISTITEM_PADDING,
  DEFAULT_LISTITEM_BORDERRADIUS,
  DEFAULT_LISTITEM_GAP,
  TESTID_LISTITEM,
  TESTID_LISTITEM_GAP,
} from './ListItem.constants';
import { VerticalAlignment } from './ListItem.types';

describe('ListItem', () => {
  it('should render snapshot correctly', () => {
    const wrapper = shallow(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render component correctly', () => {
    const wrapper = shallow(
      <ListItem>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.exists()).toBe(true);
  });

  it('should render the correct default padding', () => {
    const wrapper = shallow(
      <ListItem>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.props().style.padding).toBe(
      DEFAULT_LISTITEM_PADDING,
    );
  });

  it('should render the given padding', () => {
    const givenPadding = 12;
    const wrapper = shallow(
      <ListItem padding={givenPadding}>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.props().style.padding).toBe(givenPadding);
  });

  it('should render the correct default borderRadius', () => {
    const wrapper = shallow(
      <ListItem>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.props().style.borderRadius).toBe(
      DEFAULT_LISTITEM_BORDERRADIUS,
    );
  });

  it('should render the given borderRadius', () => {
    const givenBorderRadius = 12;
    const wrapper = shallow(
      <ListItem borderRadius={givenBorderRadius}>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.props().style.borderRadius).toBe(
      givenBorderRadius,
    );
  });

  it('should render the correct default gap', () => {
    const wrapper = shallow(
      <ListItem>
        <View />
        <View />
      </ListItem>,
    );
    const listItemGapComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM_GAP,
    );
    expect(listItemGapComponent.props().style.width).toBe(DEFAULT_LISTITEM_GAP);
  });

  it('should render the given gap', () => {
    const givenGap = 14;
    const wrapper = shallow(
      <ListItem gap={givenGap}>
        <View />
        <View />
      </ListItem>,
    );
    const listItemGapComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM_GAP,
    );
    expect(listItemGapComponent.props().style.width).toBe(givenGap);
  });

  it('should render the correct default verticalAlignment', () => {
    const wrapper = shallow(
      <ListItem>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.props().style.alignItems).toBe('flex-start');
  });

  it('should render the given verticalAlignment', () => {
    const wrapper = shallow(
      <ListItem verticalAlignment={VerticalAlignment.Center}>
        <View />
      </ListItem>,
    );
    const listItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_LISTITEM,
    );
    expect(listItemComponent.props().style.alignItems).toBe('center');
  });
});
