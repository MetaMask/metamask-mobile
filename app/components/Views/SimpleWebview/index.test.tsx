import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SimpleWebview from './';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';
import getHeaderCompactStandardNavbarOptions from '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import Device from '../../../util/device';

jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      header: () => null,
    })),
  }),
);

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isAndroid: jest.fn(() => false),
  },
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: { background: { default: 'white' } },
  }),
}));

const mockSetOptions = jest.fn();
const mockNavigation = {
  goBack: jest.fn(),
  setOptions: mockSetOptions,
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

  it('sets header options with reviewer styling and Device.isAndroid() for includesTopInset', () => {
    render(<SimpleWebview />);

    expect(getHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '',
        includesTopInset: false,
        twClassName: 'bg-default rounded-t-2xl',
        onBack: expect.any(Function),
        endButtonIconProps: expect.arrayContaining([
          expect.objectContaining({ onPress: expect.any(Function) }),
        ]),
      }),
    );
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerStyle: expect.objectContaining({
          backgroundColor: expect.any(String),
        }),
      }),
    );
  });

  it('passes includesTopInset true when Device.isAndroid() is true', () => {
    jest.mocked(Device.isAndroid).mockReturnValueOnce(true);
    render(<SimpleWebview />);

    expect(getHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        includesTopInset: true,
      }),
    );
  });

  it('calls navigation.goBack when header onBack is invoked', () => {
    render(<SimpleWebview />);

    const { onBack } = (getHeaderCompactStandardNavbarOptions as jest.Mock).mock
      .calls[0][0] as { onBack: () => void };
    onBack();

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('calls Share.open when share button onPress is invoked', () => {
    render(<SimpleWebview />);

    const { endButtonIconProps } = (
      getHeaderCompactStandardNavbarOptions as jest.Mock
    ).mock.calls[0][0] as {
      endButtonIconProps: { onPress: () => void }[];
    };
    endButtonIconProps[0].onPress();

    expect(Share.open).toHaveBeenCalledWith({ url: 'https://etherscan.io' });
  });

  it('logs error when share fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    render(<SimpleWebview />);

    const { endButtonIconProps } = (
      getHeaderCompactStandardNavbarOptions as jest.Mock
    ).mock.calls[0][0] as {
      endButtonIconProps: { onPress: () => void }[];
    };
    endButtonIconProps[0].onPress();

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'Error while trying to share simple web view',
        expect.any(Error),
      );
    });
  });
});
