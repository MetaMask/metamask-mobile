import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import BackupAndSyncSettings from './BackupAndSyncSettings';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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
    ).toBeDefined();
  });

  it('renders HeaderCompactStandard with backup and sync title', () => {
    const { getByTestId, getAllByText } = renderWithProvider(
      <BackupAndSyncSettings />,
    );

    expect(getByTestId(BackupAndSyncSettingsSelectorsIDs.HEADER)).toBeDefined();
    expect(getAllByText(strings('backupAndSync.title')).length).toBeGreaterThan(
      0,
    );
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<BackupAndSyncSettings />);

    fireEvent.press(getByTestId(BackupAndSyncSettingsSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
