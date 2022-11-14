// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../Icons/Icon';
import { TEST_ICON_PROPS } from '../Icon/Icon.constants';

// Internal dependencies.
import IconContainer from './IconContainer';
import {
  ICON_CONTAINER_TEST_ID,
  ICON_CONTAINER_ICON_TEST_ID,
} from './IconContainer.constants';
import { IconContainerSizes } from './IconContainer.types';

describe('IconContainer - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <IconContainer
        size={IconContainerSizes.Md}
        iconProps={TEST_ICON_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('IconContainer', () => {
  it('should render IconContainer component', () => {
    const wrapper = shallow(
      <IconContainer
        size={IconContainerSizes.Md}
        iconProps={TEST_ICON_PROPS}
      />,
    );
    const IconContainerComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ICON_CONTAINER_TEST_ID,
    );
    expect(IconContainerComponent.exists()).toBe(true);
  });
  it('should render IconContainer with the right IconName', () => {
    const iconName = TEST_ICON_PROPS.name;
    const wrapper = shallow(
      <IconContainer
        size={IconContainerSizes.Md}
        iconProps={TEST_ICON_PROPS}
      />,
    );

    const IconContainerIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ICON_CONTAINER_ICON_TEST_ID,
    );
    expect(IconContainerIconComponent.props().name).toBe(iconName);
  });
});
