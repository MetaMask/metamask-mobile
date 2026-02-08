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

  it('warns in dev mode when value exists but onPressClearButton is missing', () => {
    const globalAny = global as unknown as { __DEV__: boolean };
    const originalDev = globalAny.__DEV__;
    globalAny.__DEV__ = true;
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    shallow(
      <TextFieldSearch
        value="search text"
        onPressClearButton={undefined as unknown as () => void}
      />,
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'TextFieldSearch: onPressClearButton should be provided when using controlled value',
    );

    consoleWarnSpy.mockRestore();
    globalAny.__DEV__ = originalDev;
  });

  it('does not warn when onPressClearButton is provided', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    shallow(
      <TextFieldSearch
        value="search text"
        onPressClearButton={mockOnPressClearButton}
      />,
    );

    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
