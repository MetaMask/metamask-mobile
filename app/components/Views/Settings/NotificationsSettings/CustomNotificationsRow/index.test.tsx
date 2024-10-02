import React from 'react';
import CustomNotificationsRow from '@components/Views/Settings/NotificationsSettings/CustomNotificationsRow';
import { render } from '@testing-library/react-native';
import notificationsRows from '@components/Views/Settings/NotificationsSettings/notificationsRows';

describe('CustomNotificationsRow', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <CustomNotificationsRow
      title={notificationsRows[0].title}
      description={notificationsRows[0].description}
      icon={notificationsRows[0].icon}
      isEnabled={notificationsRows[0].value}
      toggleCustomNotificationsEnabled={()=> jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
