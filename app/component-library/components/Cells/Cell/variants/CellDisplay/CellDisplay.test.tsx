// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import {
  CELLDISPLAY_TEST_ID,
  SAMPLE_CELLDISPLAY_TITLE,
  SAMPLE_CELLDISPLAY_SECONDARYTEXT,
  SAMPLE_CELLDISPLAY_TERTIARY_TEXT,
  SAMPLE_CELLDISPLAY_TAGLABEL,
  SAMPLE_CELLDISPLAY_AVATARPROPS,
} from './CellDisplay.constants';

describe('CellDisplay - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellDisplay
        avatarProps={SAMPLE_CELLDISPLAY_AVATARPROPS}
        title={SAMPLE_CELLDISPLAY_TITLE}
        secondaryText={SAMPLE_CELLDISPLAY_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELLDISPLAY_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELLDISPLAY_TAGLABEL}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellDisplay', () => {
  it('should render CellDisplay', () => {
    const wrapper = shallow(
      <CellDisplay
        avatarProps={SAMPLE_CELLDISPLAY_AVATARPROPS}
        title={SAMPLE_CELLDISPLAY_TITLE}
        secondaryText={SAMPLE_CELLDISPLAY_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELLDISPLAY_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELLDISPLAY_TAGLABEL}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLDISPLAY_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
