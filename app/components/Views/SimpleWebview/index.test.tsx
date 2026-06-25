import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SimpleWebview from './';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';

const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  setOptions: jest.fn(),
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

  it('renders HeaderStandard with back and share actions', () => {
    const { getByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview-back-button')).toBeOnTheScreen();
    expect(getByTestId('simple-webview-share-button')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = render(<SimpleWebview />);
    fireEvent.press(getByTestId('simple-webview-back-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls Share.open when share button is pressed', () => {
    const { getByTestId } = render(<SimpleWebview />);
    fireEvent.press(getByTestId('simple-webview-share-button'));

    expect(Share.open).toHaveBeenCalledWith({ url: 'https://etherscan.io' });
  });

  it('logs error when share fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    const { getByTestId } = render(<SimpleWebview />);
    fireEvent.press(getByTestId('simple-webview-share-button'));

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'Error while trying to share simple web view',
        expect.any(Error),
      );
    });
  });
});
