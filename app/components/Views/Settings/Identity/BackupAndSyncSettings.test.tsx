import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';

import BackupAndSyncSettings from './BackupAndSyncSettings';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { BackupAndSyncSettingsSelectorsIDs } from './BackupAndSyncSettings.testIds';
import { strings } from '../../../../../locales/i18n';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

describe('BackupAndSyncSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<BackupAndSyncSettings />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('wraps content in SafeAreaView', () => {
    const { getByTestId } = renderWithProvider(<BackupAndSyncSettings />);

    expect(
      getByTestId(BackupAndSyncSettingsSelectorsIDs.SAFE_AREA),
    ).toBeOnTheScreen();
  });

  it('renders HeaderCompactStandard with backup and sync title', () => {
    const { getByTestId } = renderWithProvider(<BackupAndSyncSettings />);

    const header = getByTestId(BackupAndSyncSettingsSelectorsIDs.HEADER);
    expect(header).toBeOnTheScreen();
    expect(
      within(header).getByText(strings('backupAndSync.title')),
    ).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<BackupAndSyncSettings />);

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
