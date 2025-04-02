import React from 'react';
import PhishingModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';

// Mock Linking API
const mockCanOpenURL = jest.fn(() => Promise.resolve(true));
const mockOpenURL = jest.fn(() => Promise.resolve());
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: mockOpenURL,
  canOpenURL: mockCanOpenURL,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
}));

describe('PhishingModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<PhishingModal />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should open Twitter with correct sharing text when share button is pressed', async () => {
    const { getByText } = renderWithProvider(<PhishingModal fullUrl="https://malicious-site.com" />);

    // Find and press the share button
    const shareButton = getByText('If you found this helpful, share on X!');
    fireEvent.press(shareButton);

    // Verify Linking.canOpenURL was called
    expect(mockCanOpenURL).toHaveBeenCalled();

    // Check the URL that was passed to canOpenURL
    expect(mockCanOpenURL).toHaveBeenCalledWith(expect.stringContaining('twitter.com/intent/tweet'));
    expect(mockCanOpenURL).toHaveBeenCalledWith(expect.stringContaining('MetaMask just protected me from a phishing attack!'));

    // Verify Linking.openURL was called with the expected URL pattern
    await Promise.resolve(); // Wait for the canOpenURL promise to resolve
    expect(mockOpenURL).toHaveBeenCalledWith(expect.stringContaining('twitter.com/intent/tweet'));
  });
});


