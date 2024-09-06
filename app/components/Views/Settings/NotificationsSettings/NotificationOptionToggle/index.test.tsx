import React from 'react';
import NotificationOptionToggle from './index';
import { render } from '@testing-library/react-native';
import { NotificationsToggleTypes } from '../NotificationsSettings.constants';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({})),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));

jest.mock('../../../../../selectors/notifications', () => ({
  getNotificationsList: jest.fn(),
}));
describe('NotificationOptionToggle', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NotificationOptionToggle
        icon={AvatarAccountType.Blockies}
        type={NotificationsToggleTypes.ACCOUNT}
        address={'0x123123123'}
        title={'0x123123123'}
        isEnabled
        isLoading={false}
        disabledSwitch={false}
        refetchAccountSettings={() => Promise.resolve()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
