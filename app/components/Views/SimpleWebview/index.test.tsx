import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SimpleWebview from './';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';
import getHeaderCompactStandardNavbarOptions from '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';

jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions',
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
    expect(getHeaderCompactStandardNavbarOptions).toHaveBeenCalled();
  });

  it('calls Share.open when share button is pressed', () => {
    render(<SimpleWebview />);

    const call = (getHeaderCompactStandardNavbarOptions as jest.Mock).mock
      .calls[0][0];
    const shareButton = call.endButtonIconProps[0];
    shareButton.onPress();

    expect(Share.open).toHaveBeenCalledWith({ url: 'https://etherscan.io' });
  });

  it('logs error when share function fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    render(<SimpleWebview />);

    const call = (getHeaderCompactStandardNavbarOptions as jest.Mock).mock
      .calls[0][0];
    const shareButton = call.endButtonIconProps[0];
    shareButton.onPress();

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'Error while trying to share simple web view',
        expect.any(Error),
      );
    });
  });
});
