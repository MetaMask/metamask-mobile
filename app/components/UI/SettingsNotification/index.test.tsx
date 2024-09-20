import React from 'react';
import { shallow } from 'enzyme';
import SettingsNotification from './';
import { StyleSheet } from 'react-native';

const defaultStyle = StyleSheet.create({
  defaultStyle: {
    flex: 1,
  },
});

describe('SettingsNotification', () => {
  it('should render correctly as warning', () => {
    const wrapper = shallow(
      <SettingsNotification isWarning style={defaultStyle.defaultStyle}>
        {'this is a warning'}
      </SettingsNotification>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly as notification', () => {
    const wrapper = shallow(
      <SettingsNotification isWarning isNotification style={defaultStyle.defaultStyle}>
        {'this is a notification'}
      </SettingsNotification>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
