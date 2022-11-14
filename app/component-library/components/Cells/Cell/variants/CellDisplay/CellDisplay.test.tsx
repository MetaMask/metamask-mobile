// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { SAMPLE_AVATAR_PROPS } from '../../../../Avatars/Avatar/Avatar.constants';
import { SAMPLE_CELL_TITLE } from '../../Cell.constants';
import { CellVariants } from '../../Cell.types';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import { CELL_DISPLAY_TEST_ID } from './CellDisplay.constants';

describe('CellDisplay - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellDisplay
        variant={CellVariants.Display}
        avatarProps={SAMPLE_AVATAR_PROPS}
        title={SAMPLE_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellDisplay', () => {
  it('should render CellDisplay', () => {
    const wrapper = shallow(
      <CellDisplay
        variant={CellVariants.Display}
        avatarProps={SAMPLE_AVATAR_PROPS}
        title={SAMPLE_CELL_TITLE}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
