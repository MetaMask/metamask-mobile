///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import SnapsSettingsList from './SnapsSettingsList';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { strings } from '../../../../../locales/i18n';
import {
  SNAPS_SETTINGS_LIST_BACK_BUTTON,
  SNAPS_SETTINGS_LIST_HEADER,
} from './SnapsSettingsList.constants';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      SnapController: {
        isReady: true,
        snapStates: {},
        snaps: {},
        unencryptedSnapStates: {},
      },
    },
  },
};

describe('SnapsSettingsList', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders HeaderStandard with snaps title and back button', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <SnapsSettingsList />,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: initialState as any,
      },
    );

    expect(getByTestId(SNAPS_SETTINGS_LIST_HEADER)).toBeOnTheScreen();
    expect(getByTestId(SNAPS_SETTINGS_LIST_BACK_BUTTON)).toBeOnTheScreen();
    expect(getByText(strings('app_settings.snaps.title'))).toBeOnTheScreen();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SnapsSettingsList />, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: initialState as any,
    });

    fireEvent(getByTestId(SNAPS_SETTINGS_LIST_BACK_BUTTON), 'onPress');
    expect(mockGoBack).toHaveBeenCalled();
  });
});
///: END:ONLY_INCLUDE_IF
