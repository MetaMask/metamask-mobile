import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import AnnouncementsDetails from '.';
import { createStyles } from '../styles';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../../../../../components/UI/Notification/__mocks__/mock_notifications';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { mockTheme } from '../../../../../util/theme';
import { FeatureAnnouncementRawNotification } from '../../../../../util/notifications/types';

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

describe('AnnouncementsDetails', () => {
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
      <AnnouncementsDetails
        styles={styles}
        navigation={navigation}
        notification={
          MOCK_NOTIFICATIONS[0] as FeatureAnnouncementRawNotification
        }
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
