// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import { AVATARNETWORK_IMAGE_TESTID } from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies
import BadgeNetwork from './BadgeNetwork';
import {
  BADGENETWORK_TEST_ID,
  SAMPLE_BADGENETWORK_PROPS,
} from './BadgeNetwork.constants';

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
});
