// Third party dependencies
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

// External dependencies
import { AVATARNETWORK_IMAGE_TESTID } from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { AvatarSize } from '../../../../Avatars/Avatar';

// Internal dependencies
import BadgeNetwork from './BadgeNetwork';
import {
  BADGENETWORK_TEST_ID,
  SAMPLE_BADGENETWORK_PROPS,
} from './BadgeNetwork.constants';
import getScaledStyles from './BadgeNetwork.utils';

describe('BadgeNetwork', () => {
  const renderComponent = (props = {}) =>
    render(<BadgeNetwork {...SAMPLE_BADGENETWORK_PROPS} {...props} />);

  it('should render BadgeNetwork', () => {
    const { toJSON, queryByTestId } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
    expect(queryByTestId(BADGENETWORK_TEST_ID)).not.toBe(null);
  });

  it('should render with correct image source', () => {
    const { getByTestId } = renderComponent();
    const imgElement = getByTestId(AVATARNETWORK_IMAGE_TESTID);
    expect(imgElement.props.source).toEqual(
      SAMPLE_BADGENETWORK_PROPS.imageSource,
    );
  });

  it('should apply scaled style only when isScaled is true', () => {
    const containerSize = {
      height: 32,
      width: 32,
    };
    const sampleSize = AvatarSize.Md;
    const { getByTestId } = render(
      <View style={containerSize}>
        <BadgeNetwork
          {...SAMPLE_BADGENETWORK_PROPS}
          isScaled
          size={sampleSize}
        />
      </View>,
    );
    const scaledStyled = getScaledStyles(Number(sampleSize), containerSize);
    const badgeNetworkElement = getByTestId(BADGENETWORK_TEST_ID);
    expect(badgeNetworkElement.props.style.minHeight).toBe(
      scaledStyled.minHeight,
    );
    expect(badgeNetworkElement.props.style.maxHeight).toBe(
      scaledStyled.maxHeight,
    );
    expect(badgeNetworkElement.props.style.height).toBe(scaledStyled.height);
  });

  it('should not apply scaled style when isScaled is false', () => {
    const containerSize = {
      height: 32,
      width: 32,
    };
    const sampleSize = AvatarSize.Md;
    const { getByTestId } = render(
      <View style={containerSize}>
        <BadgeNetwork
          {...SAMPLE_BADGENETWORK_PROPS}
          isScaled={false}
          size={sampleSize}
        />
      </View>,
    );
    const badgeNetworkElement = getByTestId(BADGENETWORK_TEST_ID);
    expect(badgeNetworkElement.props.style.minHeight).not.toBeDefined();
    expect(badgeNetworkElement.props.style.maxHeight).not.toBeDefined();
    expect(badgeNetworkElement.props.style.height).not.toBeDefined();
  });
});
