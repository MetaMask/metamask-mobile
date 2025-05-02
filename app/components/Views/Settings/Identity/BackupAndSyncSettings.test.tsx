import React from 'react';

import BackupAndSyncSettings from './BackupAndSyncSettings';
import renderWithProvider from '../../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: () => ({
    enableBackupAndSync: jest.fn(),
    trackEnableBackupAndSyncEvent: jest.fn(),
  }),
  useRoute: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

describe('BackupAndSyncSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<BackupAndSyncSettings />);
    expect(toJSON()).toMatchSnapshot();
  });
});
