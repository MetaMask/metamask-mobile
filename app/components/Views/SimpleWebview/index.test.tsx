import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SimpleWebview from './';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';

jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard',
  () => ({
    __esModule: true,
    default: jest.fn(() => null),
  }),
);

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

  it('renders the HeaderCompactStandard with safe area top inset', () => {
    render(<SimpleWebview />);

    expect(HeaderCompactStandard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '',
        includesTopInset: true,
        onBack: expect.any(Function),
        endButtonIconProps: expect.arrayContaining([
          expect.objectContaining({ onPress: expect.any(Function) }),
        ]),
      }),
      undefined,
    );
  });

  it('calls navigation.goBack when header onBack is invoked', () => {
    render(<SimpleWebview />);

    const headerProps = (HeaderCompactStandard as unknown as jest.Mock).mock
      .calls[0][0] as { onBack: () => void };
    headerProps.onBack();

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls Share.open when share button onPress is invoked', () => {
    render(<SimpleWebview />);

    const headerProps = (HeaderCompactStandard as unknown as jest.Mock).mock
      .calls[0][0] as { endButtonIconProps: { onPress: () => void }[] };
    headerProps.endButtonIconProps[0].onPress();

    expect(Share.open).toHaveBeenCalledWith({ url: 'https://etherscan.io' });
  });

  it('logs error when share fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    render(<SimpleWebview />);

    const headerProps = (HeaderCompactStandard as unknown as jest.Mock).mock
      .calls[0][0] as { endButtonIconProps: { onPress: () => void }[] };
    headerProps.endButtonIconProps[0].onPress();

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'Error while trying to share simple web view',
        expect.any(Error),
      );
    });
  });
});
