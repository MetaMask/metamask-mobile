// External dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies
import AvatarGroup from './AvatarGroup';
import {
  SAMPLE_AVATARGROUP_PROPS,
  AVATARGROUP_AVATAR_CONTAINER_TESTID,
  AVATARGROUP_AVATAR_TESTID,
  AVATARGROUP_OVERFLOWCOUNTER_TESTID,
} from './AvatarGroup.constants';

describe('AvatarGroup', () => {
  const renderComponent = (props = {}) =>
    render(<AvatarGroup {...SAMPLE_AVATARGROUP_PROPS} {...props} />);

  it('should render AvatarGroup component', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the correct number of avatars', () => {
    const { getAllByTestId } = renderComponent();
    const avatars = getAllByTestId(AVATARGROUP_AVATAR_TESTID);
    expect(avatars.length).toBe(SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars);
  });

  it('should render the overflow counter when there are more avatars than the max limit', () => {
    const { getByTestId } = renderComponent();
    const overflowCounter = getByTestId(AVATARGROUP_OVERFLOWCOUNTER_TESTID);
    expect(overflowCounter).toBeDefined();
    const overflowCounterNumber = SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars
      ? SAMPLE_AVATARGROUP_PROPS.avatarPropsList.length -
        SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars
      : SAMPLE_AVATARGROUP_PROPS.avatarPropsList.length;
    expect(overflowCounter.props.children).toBe(`+${overflowCounterNumber}`);
  });

  it('should not render the overflow counter when there are fewer or equal avatars than the max limit', () => {
    const { queryByTestId } = renderComponent({
      avatarPropsList: SAMPLE_AVATARGROUP_PROPS.avatarPropsList.slice(
        0,
        SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars,
      ),
    });
    const overflowCounter = queryByTestId(AVATARGROUP_OVERFLOWCOUNTER_TESTID);
    expect(overflowCounter).toBeNull();
  });

  it('should apply the correct space between avatars if custom spaceBetweenAvatars was given', () => {
    const spaceBetweenAvatars = -10;

    const { getByTestId } = renderComponent({
      spaceBetweenAvatars,
    });

    const firstAvatarContainer = getByTestId(
      `${AVATARGROUP_AVATAR_CONTAINER_TESTID}-0`,
    );
    const secondAvatarContainer = getByTestId(
      `${AVATARGROUP_AVATAR_CONTAINER_TESTID}-1`,
    );
    const thirdAvatarContainer = getByTestId(
      `${AVATARGROUP_AVATAR_CONTAINER_TESTID}-2`,
    );
    expect(firstAvatarContainer.props.style.marginLeft).toBe(0);
    expect(secondAvatarContainer.props.style.marginLeft).toBe(
      spaceBetweenAvatars,
    );
    expect(thirdAvatarContainer.props.style.marginLeft).toBe(
      spaceBetweenAvatars,
    );
  });
});
