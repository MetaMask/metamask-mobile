import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import GetStarted from './GetStarted';
import { useDepositSDK } from '../../../sdk';
import { getDepositNavbarOptions } from '../../../../../Navbar';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

jest.mock('../../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({}),
}));

const mockSetOptions = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      setOptions: mockSetOptions,
      reset: mockReset,
    }),
  };
});

describe('GetStarted', () => {
  const mockSetGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDepositSDK as jest.Mock).mockReturnValue({
      getStarted: false,
      setGetStarted: mockSetGetStarted,
    });
  });

  it('render matches snapshot', () => {
    renderWithProvider(<GetStarted />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders blank screen when getStarted is true', () => {
    (useDepositSDK as jest.Mock).mockReturnValue({
      getStarted: true,
      setGetStarted: mockSetGetStarted,
    });

    renderWithProvider(<GetStarted />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions with navbar options when rendering', () => {
    renderWithProvider(<GetStarted />);
    expect(mockSetOptions).toHaveBeenCalledTimes(1);
    expect(getDepositNavbarOptions).toHaveBeenCalledWith(
      expect.anything(),
      { title: 'Deposit' },
      expect.anything(),
    );
  });

  it('calls setGetStarted when the "Get started" button is pressed', () => {
    renderWithProvider(<GetStarted />);
    const getStartedButton = screen.getByText('Get started');
    fireEvent.press(getStartedButton);
    expect(mockSetGetStarted).toHaveBeenCalledWith(true);
  });
});
