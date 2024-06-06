import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import OnChainDetails from '.';
import { createStyles } from '../styles';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../../../../../components/UI/Notification/__mocks__/mock_notifications';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { mockTheme } from '../../../../../util/theme';
import { HalRawNotification } from '../../../../../util/notifications/types';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  notificationsSettings: {
    isEnabled: true,
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

jest.mock('@react-navigation/native');

describe('OnChainDetails', () => {
  let navigation: NavigationProp<ParamListBase>;
  let styles: Record<string, any>;
  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;
    styles = createStyles(mockTheme);
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <OnChainDetails
        notification={MOCK_NOTIFICATIONS[0] as HalRawNotification}
        styles={styles}
        theme={mockTheme}
        accountAvatarType={AvatarAccountType.Blockies}
        navigation={navigation}
        copyToClipboard={jest.fn()}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
