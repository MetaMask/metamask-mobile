import React from 'react';
import PhishingModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent , act } from '@testing-library/react-native';

import { Linking } from 'react-native';

// Mock Linking API
const mockCanOpenURL = jest.fn(() => Promise.resolve(true));
const mockOpenURL = jest.fn(() => Promise.resolve());

beforeEach(() => {
  jest.spyOn(Linking, 'canOpenURL').mockImplementation(mockCanOpenURL);
  jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);
});

describe('PhishingModal', () => {
  it('should render correctly', async () => {
    const component = renderWithProvider(<PhishingModal />);
    expect(component).toMatchSnapshot();
  });

  it('should open Twitter with correct sharing text when share button is pressed', async () => {
    const { getByText } = renderWithProvider(
      <PhishingModal fullUrl="https://malicious-site.com" />,
    );

    // Find and press the share button
    const shareButton = getByText('If you found this helpful, share on X!');
    await act(async () => {
      fireEvent.press(shareButton);
    });

    // Verify Linking.canOpenURL was called
    expect(mockCanOpenURL).toHaveBeenCalled();

    // Check the URL that was passed to canOpenURL
    expect(mockCanOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
    );
    expect(mockCanOpenURL).toHaveBeenCalledWith(
      expect.stringContaining(
        'MetaMask%20just%20protected%20me%20from%20a%20phishing%20attack!',
      ),
    );

    // Verify Linking.openURL was called with the expected URL pattern
    await Promise.resolve(); // Wait for the canOpenURL promise to resolve
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
    );
  });
});
