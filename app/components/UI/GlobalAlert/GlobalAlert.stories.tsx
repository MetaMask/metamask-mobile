import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { View } from 'react-native';

import { storybookStore } from '../../../../.storybook/storybook-store';
import GlobalAlert from './index';

const mockStore = configureMockStore();

const createAlertStore = (data: {
  msg: string;
  width?: number;
}) =>
  mockStore({
    ...storybookStore,
    alert: {
      isVisible: true,
      autodismiss: null,
      content: 'clipboard-alert',
      data,
    },
  });

const ClipboardAlertStory = ({
  msg,
  width,
}: {
  msg: string;
  width?: number;
}) => (
  <Provider store={createAlertStore({ msg, width })}>
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <GlobalAlert />
    </View>
  </Provider>
);

const GlobalAlertMeta = {
  title: 'Components / GlobalAlert',
  component: GlobalAlert,
  argTypes: {
    msg: {
      control: { type: 'text' },
      defaultValue: 'Address copied to clipboard',
    },
    width: {
      control: { type: 'number' },
      defaultValue: 280,
    },
  },
};

export default GlobalAlertMeta;

export const ClipboardAlert = {
  args: {
    msg: 'Address copied to clipboard',
    width: 280,
  },
  render: (args: { msg: string; width: number }) => (
    <ClipboardAlertStory msg={args.msg} width={args.width} />
  ),
};
