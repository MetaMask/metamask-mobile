// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';
import styles from './TextFieldSearch.styles';

describe('TextFieldSearch', () => {
  const mockOnPressClearButton = jest.fn();

  beforeEach(() => {
    mockOnPressClearButton.mockClear();
  });

  it('renders default settings correctly', () => {
    const wrapper = shallow(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders TextFieldSearch component', () => {
    const wrapper = shallow(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldSearchComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldSearchComponent.exists()).toBe(true);
  });

  it('applies rounded border radius style', () => {
    const wrapper = shallow(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );
    const styleArray = textFieldComponent.prop('style');

    expect(styleArray).toContainEqual(styles.base);
  });

  it('renders clear button when value exists', () => {
    const wrapper = shallow(
      <TextFieldSearch
        value="search text"
        onPressClearButton={mockOnPressClearButton}
      />,
    );

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldComponent.prop('endAccessory')).not.toBe(false);
  });

  it('hides clear button when no value', () => {
    const wrapper = shallow(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldComponent.prop('endAccessory')).toBe(false);
  });

  it('hides clear button when value is empty string', () => {
    const wrapper = shallow(
      <TextFieldSearch value="" onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldComponent.prop('endAccessory')).toBe(false);
  });
});
