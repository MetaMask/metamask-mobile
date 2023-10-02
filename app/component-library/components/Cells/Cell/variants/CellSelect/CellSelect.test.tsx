// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellSelect from './CellSelect';
import {
  CELLSELECT_TEST_ID,
  SAMPLE_CELLSELECT_TITLE,
  SAMPLE_CELLSELECT_SECONDARYTEXT,
  SAMPLE_CELLSELECT_TERTIARY_TEXT,
  SAMPLE_CELLSELECT_TAGLABEL,
  SAMPLE_CELLSELECT_AVATARPROPS,
} from './CellSelect.constants';

describe('CellSelect - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellSelect
        title={SAMPLE_CELLSELECT_TITLE}
        secondaryText={SAMPLE_CELLSELECT_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELLSELECT_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELLSELECT_TAGLABEL}
        avatarProps={SAMPLE_CELLSELECT_AVATARPROPS}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellSelect
        title={SAMPLE_CELLSELECT_TITLE}
        secondaryText={SAMPLE_CELLSELECT_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELLSELECT_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELLSELECT_TAGLABEL}
        avatarProps={SAMPLE_CELLSELECT_AVATARPROPS}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellSelect', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellSelect
        title={SAMPLE_CELLSELECT_TITLE}
        secondaryText={SAMPLE_CELLSELECT_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELLSELECT_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELLSELECT_TAGLABEL}
        avatarProps={SAMPLE_CELLSELECT_AVATARPROPS}
        onPress={jest.fn}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLSELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
