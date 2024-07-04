// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
    const { toJSON } = render(
      <ListItemColumn>
        <View />
      </ListItemColumn>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render component correctly', () => {
    render(
      <ListItemColumn>
        <View />
      </ListItemColumn>,
    );
    const listItemColumnComponent = screen.getByTestId(TESTID_LISTITEMCOLUMN);
    expect(listItemColumnComponent).toBeTruthy();
  });

  it('should render the correct default widthType', () => {
    render(
      <ListItemColumn widthType={DEFAULT_LISTITEMCOLUMN_WIDTHTYPE}>
        <View />
      </ListItemColumn>,
    );
    const listItemColumnComponent = screen.getByTestId(TESTID_LISTITEMCOLUMN);
    expect(listItemColumnComponent.props.style.flex).toBe(-1);
  });

  it('should render the given widthType', () => {
    render(
      <ListItemColumn widthType={WidthType.Fill}>
        <View />
      </ListItemColumn>,
    );
    const listItemColumnComponent = screen.getByTestId(TESTID_LISTITEMCOLUMN);
    expect(listItemColumnComponent.props.style.flex).toBe(1);
  });
});
