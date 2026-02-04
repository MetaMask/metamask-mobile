// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';
import styles from './TextFieldSearch.styles';

describe('TextFieldSearch', () => {
  it('renders default settings correctly', () => {
    const wrapper = shallow(<TextFieldSearch />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders TextFieldSearch component', () => {
    const wrapper = shallow(<TextFieldSearch />);

    const textFieldSearchComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldSearchComponent.exists()).toBe(true);
  });

  it('applies rounded border radius style', () => {
    const wrapper = shallow(<TextFieldSearch />);

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );
    const styleArray = textFieldComponent.prop('style');

    expect(styleArray).toContainEqual(styles.base);
  });

  it('renders clear button when showClearButton is true', () => {
    const mockOnPress = jest.fn();
    const wrapper = shallow(
      <TextFieldSearch showClearButton onPressClearButton={mockOnPress} />,
    );

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldComponent.prop('endAccessory')).not.toBe(false);
  });

  it('hides clear button by default', () => {
    const wrapper = shallow(<TextFieldSearch />);

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );

    expect(textFieldComponent.prop('endAccessory')).toBe(false);
  });
});
