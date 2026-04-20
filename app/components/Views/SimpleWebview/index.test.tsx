import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SimpleWebview from './';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';

const mockHeaderCompactStandard = jest.fn((_props: unknown) => null);
jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard/HeaderCompactStandard',
  () => (props: unknown) => mockHeaderCompactStandard(props),
);

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: { background: { default: 'white' } },
  }),
}));

const mockNavigation = {
  goBack: jest.fn(),
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

interface HeaderMockProps {
  onBack: () => void;
  endButtonIconProps: { onPress: () => void }[];
}

function getHeaderPropsFromFirstCall(): HeaderMockProps {
  expect(mockHeaderCompactStandard).toHaveBeenCalled();
  const firstCall = mockHeaderCompactStandard.mock.calls[0];
  expect(firstCall).toBeDefined();
  return firstCall[0] as HeaderMockProps;
}

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

  it('renders HeaderCompactStandard with correct props', () => {
    render(<SimpleWebview />);

    expect(mockHeaderCompactStandard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '',
        onBack: expect.any(Function),
        endButtonIconProps: expect.arrayContaining([
          expect.objectContaining({ onPress: expect.any(Function) }),
        ]),
      }),
    );
  });

  it('calls navigation.goBack when back button is pressed', () => {
    render(<SimpleWebview />);

    const { onBack } = getHeaderPropsFromFirstCall();
    onBack();

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('calls Share.open when share button is pressed', () => {
    render(<SimpleWebview />);

    const { endButtonIconProps } = getHeaderPropsFromFirstCall();
    endButtonIconProps[0].onPress();

    expect(Share.open).toHaveBeenCalledWith({ url: 'https://etherscan.io' });
  });

  it('logs error when share fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    render(<SimpleWebview />);

    const { endButtonIconProps } = getHeaderPropsFromFirstCall();
    endButtonIconProps[0].onPress();

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'Error while trying to share simple web view',
        expect.any(Error),
      );
    });
  });
});
