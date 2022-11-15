// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { SAMPLE_ICON_PROPS } from '../Icon/Icon.constants';

// Internal dependencies.
import IconInACircle from './IconInACircle';
import {
  ICON_CONTAINER_TEST_ID,
  ICON_CONTAINER_ICON_TEST_ID,
} from './IconInACircle.constants';
import { IconInACircleSizes } from './IconInACircle.types';

describe('IconInACircle - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <IconInACircle
        size={IconInACircleSizes.Md}
        iconProps={SAMPLE_ICON_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('IconInACircle', () => {
  it('should render IconInACircle component', () => {
    const wrapper = shallow(
      <IconInACircle
        size={IconInACircleSizes.Md}
        iconProps={SAMPLE_ICON_PROPS}
      />,
    );
    const IconInACircleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ICON_CONTAINER_TEST_ID,
    );
    expect(IconInACircleComponent.exists()).toBe(true);
  });
  it('should render IconInACircle with the right IconName', () => {
    const iconName = SAMPLE_ICON_PROPS.name;
    const wrapper = shallow(
      <IconInACircle
        size={IconInACircleSizes.Md}
        iconProps={SAMPLE_ICON_PROPS}
      />,
    );

    const IconInACircleIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ICON_CONTAINER_ICON_TEST_ID,
    );
    expect(IconInACircleIconComponent.props().name).toBe(iconName);
  });
});
