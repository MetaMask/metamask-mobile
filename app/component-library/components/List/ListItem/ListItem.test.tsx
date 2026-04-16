// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItem from './ListItem';
import {
  DEFAULT_LISTITEM_GAP,
  TESTID_LISTITEM_GAP,
} from './ListItem.constants';
import { VerticalAlignment } from './ListItem.types';

describe('ListItem', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the top accessory', () => {
    const wrapper = render(
      <ListItem topAccessory={<View />}>
        <View />
      </ListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the bottom accessory', () => {
    const wrapper = render(
      <ListItem bottomAccessory={<View />}>
        <View />
      </ListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct topAccessoryGap', () => {
    const givenTopAccessoryGap = 20;
    const { getByRole } = render(
      <ListItem topAccessory={<View />} topAccessoryGap={givenTopAccessoryGap}>
        <View />
      </ListItem>,
    );
    expect(getByRole('none').props.children[0].props.style.marginBottom).toBe(
      givenTopAccessoryGap,
    );
  });

  it('should render the correct bottomAccessoryGap', () => {
    const givenBottomAccessoryGap = 20;
    const { getByRole } = render(
      <ListItem
        bottomAccessory={<View />}
        bottomAccessoryGap={givenBottomAccessoryGap}
      >
        <View />
      </ListItem>,
    );
    expect(getByRole('none').props.children[2].props.style.marginTop).toBe(
      givenBottomAccessoryGap,
    );
  });

  it('should render the correct default gap', () => {
    const { getByTestId } = render(
      <ListItem>
        <View />
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM_GAP).props.style.width).toBe(
      DEFAULT_LISTITEM_GAP,
    );
  });

  it('should render the given gap', () => {
    const givenGap = 20;
    const { getByTestId } = render(
      <ListItem gap={givenGap}>
        <View />
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM_GAP).props.style.width).toBe(givenGap);
  });

  it('should not render a gap with only 1 child', () => {
    const { queryByTestId } = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(queryByTestId(TESTID_LISTITEM_GAP)).toBeNull();
  });

  it('should render the correct default verticalAlignment', () => {
    const { getByRole } = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(getByRole('none').props.children[1].props.style.alignItems).toBe(
      'center',
    );
  });

  it('should render the given verticalAlignment', () => {
    const { getByRole } = render(
      <ListItem verticalAlignment={VerticalAlignment.Top}>
        <View />
      </ListItem>,
    );

    expect(getByRole('none').props.children[1].props.style.alignItems).toBe(
      'flex-start',
    );
  });
});
