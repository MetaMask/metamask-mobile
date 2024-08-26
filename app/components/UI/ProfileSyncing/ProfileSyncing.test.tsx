// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ProfileSyncingComponent from './ProfileSyncing';
import renderWithProvider from '../../../util/test/renderWithProvider';

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: true,
      },
      NotificationServicesController: {
        isNotificationServicesEnabled: true,
      },
      AuthenticationController: {
        isSignedIn: true,
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: unknown) => unknown) => fn(MOCK_STORE_STATE),
}));

const handleSwitchToggle = jest.fn();

describe('ProfileSyncing', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <ProfileSyncingComponent handleSwitchToggle={handleSwitchToggle} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
