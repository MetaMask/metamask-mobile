import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SimpleWebview from './';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';
import getHeaderCenterNavbarOptions from '../../../component-library/components-temp/HeaderCenter/getHeaderCenterNavbarOptions';

jest.mock(
  '../../../component-library/components-temp/HeaderCenter/getHeaderCenterNavbarOptions',
  () => jest.fn(() => ({})),
);

const mockNavigation = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(() => ({
    params: { url: 'https://etherscan.io' },
  })),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

describe('SimpleWebview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (Share.open as jest.Mock).mockImplementation(() => Promise.resolve());
  });

  it('renders correctly', () => {
    const { toJSON } = render(<SimpleWebview />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('sets navigation options on mount', () => {
    render(<SimpleWebview />);

    expect(mockNavigation.setOptions).toHaveBeenCalled();
    expect(getHeaderCenterNavbarOptions).toHaveBeenCalled();
  });

  it('calls share function when dispatch is called', () => {
    mockNavigation.setParams = jest.fn(({ dispatch }) => dispatch());
    render(<SimpleWebview />);

    const open = jest.spyOn(Share, 'open');
    expect(open).toHaveBeenCalled();
  });

  it('logs error when share function fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    jest
      .spyOn(Share, 'open')
      .mockImplementation(() => Promise.reject(new Error('Test error')));
    mockNavigation.setParams = jest.fn(({ dispatch }) => dispatch());

    render(<SimpleWebview />);

    await waitFor(() => {
      expect(log).toHaveBeenCalled();
    });
  });
});
