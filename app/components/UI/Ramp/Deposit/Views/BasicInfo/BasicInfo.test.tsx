import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import BasicInfo from './BasicInfo';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';
import { BuyQuote } from '@consensys/native-ramps-sdk';

interface MockQuote {
  id: string;
  amount: number;
  currency: string;
}

const mockQuote: MockQuote = {
  id: 'test-quote-id',
  amount: 100,
  currency: 'USD',
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
    useRoute: () => ({
      params: { quote: mockQuote as unknown as BuyQuote },
    }),
  };
});

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.BASIC_INFO,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('BasicInfo Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetNavigationOptions.mockClear();
  });

  it('render matches snapshot', () => {
    render(BasicInfo);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('snapshot matches validation errors when continue is pressed with empty fields', () => {
    render(BasicInfo);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to address page when form is valid and continue is pressed', () => {
    render(BasicInfo);

    fireEvent.changeText(screen.getByTestId('first-name-input'), 'John');
    fireEvent.changeText(screen.getByTestId('last-name-input'), 'Smith');
    fireEvent.changeText(
      screen.getByPlaceholderText('(234) 567-8910'),
      '1234567890',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('MM/DD/YYYY'),
      '01/01/1990',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('XXX-XX-XXXX'),
      '123456789',
    );
    expect(screen.toJSON()).toMatchSnapshot();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      ...createEnterAddressNavDetails({
        formData: {
          dob: '01/01/1990',
          firstName: 'John',
          lastName: 'Smith',
          mobileNumber: '+11234567890',
          ssn: '123456789',
        },
        quote: mockQuote as unknown as BuyQuote,
      }),
    );
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(BasicInfo);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter your basic info',
      }),
    );
  });
});
