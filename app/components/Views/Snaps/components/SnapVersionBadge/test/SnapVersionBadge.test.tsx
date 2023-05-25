import React from 'react';
import { render } from '@testing-library/react-native';
import { SemVerVersion } from '@metamask/snaps-utils';
import SnapVersionBadge from '../SnapVersionBadge';
import {
  SNAP_VERSION_BADGE,
  SNAP_VERSION_BADGE_VALUE,
} from '../../../../../../constants/test-ids';

describe('SnapVersionBadge', () => {
  it('renders the version in the correct format', async () => {
    const { getByTestId } = render(
      <SnapVersionBadge version={'2.3.13' as SemVerVersion} />,
    );
    const versionBadge = await getByTestId(SNAP_VERSION_BADGE);
    const versionBadgeValue = await getByTestId(SNAP_VERSION_BADGE_VALUE);
    expect(versionBadge).toBeTruthy();
    expect(versionBadgeValue.props.children).toBe('v2.3.13');
  });
});
