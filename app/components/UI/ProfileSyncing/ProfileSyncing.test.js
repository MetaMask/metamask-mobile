// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ProfileSyncing from './ProfileSyncing';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('ProfileSyncing', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ProfileSyncing />);
    expect(toJSON()).toMatchSnapshot();
  });
});
