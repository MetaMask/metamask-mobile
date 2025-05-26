import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import BasicInfo from './BasicInfo';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';

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
  };
});

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Enter your basic info',
  }),
}));

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
  });

  it('renders correctly', () => {
    render(BasicInfo);
    expect(screen.getByText('Basic Info form placeholder')).toBeTruthy();
  });

  it('navigates to address page on "Continue" button press', () => {
    render(BasicInfo);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.DEPOSIT.ENTER_ADDRESS,
      undefined,
    );
  });

  it('calls setOptions when the component mounts', () => {
    render(BasicInfo);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter your basic info',
      }),
    );
  });
});
