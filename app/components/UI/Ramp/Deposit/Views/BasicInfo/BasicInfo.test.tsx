import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import BasicInfo from './BasicInfo';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { DEPOSIT_REGIONS, DepositRegion } from '../../constants';
import { timestampToTransakFormat } from '../../utils';

const mockTrackEvent = jest.fn();

const FIXED_DATE = new Date(2024, 0, 1);
const FIXED_TIMESTAMP = FIXED_DATE.getTime();

const mockQuote = {
  quoteId: 'test-quote-id',
} as BuyQuote;

const mockSelectedRegion = DEPOSIT_REGIONS.find(
  (region) => region.isoCode === 'US',
) as DepositRegion;

let mockUseParamsReturnValue: {
  quote: BuyQuote;
  previousFormData?: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    dob: string;
    ssn?: string;
  };
} = {
  quote: mockQuote,
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockUseDepositSDK = jest.fn();

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

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParamsReturnValue,
}));

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

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
  beforeEach(() => {
    const MockDate = jest.fn(() => FIXED_DATE) as unknown as DateConstructor;
    MockDate.now = jest.fn(() => FIXED_TIMESTAMP);
    global.Date = MockDate;

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockSetNavigationOptions.mockClear();
    mockTrackEvent.mockClear();
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
    const dob = new Date('1990-01-01').getTime().toString();
    render(BasicInfo);

    fireEvent.changeText(screen.getByTestId('first-name-input'), 'John');
    fireEvent.changeText(screen.getByTestId('last-name-input'), 'Smith');
    fireEvent.changeText(
      screen.getByTestId('deposit-phone-field-test-id'),
      '234567890',
    );
    fireEvent.changeText(screen.getByTestId('date-of-birth-input'), dob);
    fireEvent.changeText(
      screen.getByPlaceholderText('XXX-XX-XXXX'),
      '123456789',
    );
    fireEvent.changeText(screen.getByTestId('ssn-input'), '123456789');
    expect(screen.toJSON()).toMatchSnapshot();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      ...createEnterAddressNavDetails({
        formData: {
          dob: timestampToTransakFormat(dob),
          firstName: 'John',
          lastName: 'Smith',
          mobileNumber: '+1234567890',
          ssn: '123456789',
        },
        quote: mockQuote,
      }),
    );
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(BasicInfo);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verify your identity',
      }),
    );
  });

  it('tracks analytics event when continue button is pressed with valid form data', () => {
    const dob = new Date('1990-01-01').getTime().toString();
    render(BasicInfo);

    fireEvent.changeText(screen.getByTestId('first-name-input'), 'John');
    fireEvent.changeText(screen.getByTestId('last-name-input'), 'Smith');
    fireEvent.changeText(
      screen.getByTestId('deposit-phone-field-test-id'),
      '234567890',
    );
    fireEvent.changeText(screen.getByTestId('date-of-birth-input'), dob);
    fireEvent.changeText(screen.getByTestId('ssn-input'), '123456789');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_BASIC_INFO_ENTERED', {
      region: 'US',
      ramp_type: 'DEPOSIT',
      kyc_type: 'SIMPLE',
    });
  });

  it('prefills form data when previousFormData is provided', () => {
    const mockPreviousFormData = {
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '+1234567890',
      dob: '1993-03-25T00:00:00.000Z',
      ssn: '123456789',
    };

    mockUseParamsReturnValue = {
      quote: mockQuote,
      previousFormData: mockPreviousFormData,
    };

    render(BasicInfo);

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
