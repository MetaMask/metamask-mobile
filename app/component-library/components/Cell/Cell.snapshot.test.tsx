// 3rd party dependencies
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies
import { AccountAvatarType } from '../AccountAvatar';

// Internal dependencies
import Cell from './Cell';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_TITLE,
  TEST_CELL_SECONDARY_TEXT,
  TEST_CELL_TERTIARY_TEXT,
  TEST_LABEL_TEXT,
} from './Cell.constants';

describe('Cell - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render secondaryText when given', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        secondaryText={TEST_CELL_SECONDARY_TEXT}
        onPress={jest.fn}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render tertiaryText when given', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        tertiaryText={TEST_CELL_TERTIARY_TEXT}
        onPress={jest.fn}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render label when given', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        label={TEST_LABEL_TEXT}
        onPress={jest.fn}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        isSelected={true}
        onPress={jest.fn}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper multiselect when isMultiSelect is true', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        isMultiSelect={true}
        onPress={jest.fn}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});

