import React from 'react';
import { render } from '@testing-library/react-native';
import SettingsNotification from './';

describe('SettingsNotification', () => {
  it('should render correctly as warning', () => {
    const component = render(
      <SettingsNotification isWarning>
        {'this is a warning'}
      </SettingsNotification>,
    );
    expect(component).toMatchSnapshot();
  });

  it('should render correctly as notification', () => {
    const component = render(
      <SettingsNotification isWarning isNotification>
        {'this is a notification'}
      </SettingsNotification>,
    );
    expect(component).toMatchSnapshot();
  });
});
