import React from 'react';
import { shallow } from 'enzyme';
import SettingsNotification from './';

describe('SettingsNotification', () => {
  it('should render correctly as warning', () => {
    const { toJSON } = render(
      <SettingsNotification isWarning>
        {'this is a warning'}
      </SettingsNotification>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly as notification', () => {
    const { toJSON } = render(
      <SettingsNotification isWarning isNotification>
        {'this is a notification'}
      </SettingsNotification>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
