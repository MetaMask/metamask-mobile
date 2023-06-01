// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
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
    const wrapper = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct default padding', () => {
    const { getByTestId } = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM).props.style.padding).toBe(
      DEFAULT_LISTITEM_PADDING,
    );
  });

  it('should render the given padding', () => {
    const givenPadding = 12;
    const { getByTestId } = render(
      <ListItem padding={givenPadding}>
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM).props.style.padding).toBe(givenPadding);
  });

  it('should render the correct default borderRadius', () => {
    const { getByTestId } = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM).props.style.borderRadius).toBe(
      DEFAULT_LISTITEM_BORDERRADIUS,
    );
  });

  it('should render the given borderRadius', () => {
    const givenBorderRadius = 12;
    const { getByTestId } = render(
      <ListItem borderRadius={givenBorderRadius}>
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM).props.style.borderRadius).toBe(
      givenBorderRadius,
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

  it('should render the correct default verticalAlignment', () => {
    const { getByTestId } = render(
      <ListItem>
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM).props.style.alignItems).toBe(
      'flex-start',
    );
  });

  it('should render the given verticalAlignment', () => {
    const { getByTestId } = render(
      <ListItem verticalAlignment={VerticalAlignment.Center}>
        <View />
      </ListItem>,
    );
    expect(getByTestId(TESTID_LISTITEM).props.style.alignItems).toBe('center');
  });
});
