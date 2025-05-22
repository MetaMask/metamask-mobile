import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import StorageWrapper from '../../../store/storage-wrapper';
// eslint-disable-next-line import/no-namespace
import * as traceObj from '../../../util/trace';
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        locked: false,
      },
    }),
  };
});

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('Login', () => {
  it('should render correctly', () => {
    const spyFetch = jest
      .spyOn(traceObj, 'trace')
      .mockImplementation(() => undefined);
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ manualBackup: 'mockedManualBackupValue' }),
    );
    const { toJSON } = renderWithProvider(<Login />);
    expect(toJSON()).toMatchSnapshot();
    expect(spyFetch).toHaveBeenCalledTimes(2);
  });
});
