import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import BasicInfo from './BasicInfo';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';
import { createSsnInfoModalNavigationDetails } from '../Modals/SsnInfoModal';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { endTrace } from '../../../../../../util/trace';
import Logger from '../../../../../../util/Logger';
import {
  MOCK_REGIONS,
  MOCK_US_REGION,
  MOCK_CA_REGION,
  FIXED_DATE,
  FIXED_TIMESTAMP,
  TEST_QUOTE_ID,
  createMockSDKMethods,
} from '../../testUtils';

const { mockTrackEvent, mockPostKycForm, mockSubmitSsnDetails } =
  createMockSDKMethods();

const mockQuote = {
  quoteId: TEST_QUOTE_ID,
} as BuyQuote;

const mockSelectedRegion = MOCK_US_REGION;

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

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: (config: { method: string }) => {
    if (config.method === 'patchUser') {
      return [{}, mockPostKycForm];
    }
    if (config.method === 'submitSsnDetails') {
      return [{}, mockSubmitSsnDetails];
    }
    return [{}, jest.fn()];
  },
}));

const mockUseRegions = jest.fn();
jest.mock('../../hooks/useRegions', () => ({
  useRegions: () => mockUseRegions(),
}));

jest.mock('../../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../../util/trace'),
  endTrace: jest.fn(),
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
  beforeEach(() => {
    const MockDate = jest.fn(() => FIXED_DATE) as unknown as DateConstructor;
    MockDate.now = jest.fn(() => FIXED_TIMESTAMP);
    global.Date = MockDate;

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    mockUseRegions.mockReturnValue({
      regions: MOCK_REGIONS,
      isFetching: false,
      error: null,
    });

    mockPostKycForm.mockResolvedValue(undefined);
    mockSubmitSsnDetails.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockSetNavigationOptions.mockClear();
    mockTrackEvent.mockClear();
    mockPostKycForm.mockClear();
    mockSubmitSsnDetails.mockClear();
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

  it('snapshot matches validation errors when continue is pressed with invalid format fields', () => {
    render(BasicInfo);

    fireEvent.changeText(screen.getByTestId('first-name-input'), '   ');
    fireEvent.changeText(screen.getByTestId('last-name-input'), 'A'.repeat(36));
    fireEvent.changeText(
      screen.getByTestId('deposit-phone-field-test-id'),
      '123456789',
    );
    fireEvent.changeText(
      screen.getByTestId('date-of-birth-input'),
      'invalid-date',
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('snapshot matches validation errors when continue is pressed with invalid format fields for non-US region', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: MOCK_CA_REGION,
    });

    render(BasicInfo);

    fireEvent.changeText(screen.getByTestId('first-name-input'), '   ');
    fireEvent.changeText(screen.getByTestId('last-name-input'), 'A'.repeat(36));
    fireEvent.changeText(
      screen.getByTestId('deposit-phone-field-test-id'),
      '123456789',
    );
    fireEvent.changeText(
      screen.getByTestId('date-of-birth-input'),
      'invalid-date',
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to address page when form is valid and continue is pressed', async () => {
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
    expect(screen.toJSON()).toMatchSnapshot();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      ...createEnterAddressNavDetails({
        quote: mockQuote,
      }),
    );
  });

  it('navigates to SSN info modal when SSN info button is pressed', () => {
    render(BasicInfo);

    fireEvent.press(screen.getByTestId('ssn-info-button'));

    expect(mockNavigate).toHaveBeenCalledWith(
      ...createSsnInfoModalNavigationDetails(),
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

  it('tracks analytics event when continue button is pressed with valid form data', async () => {
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

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });

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

  it('should call endTrace twice when component mounts', () => {
    const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
    mockEndTrace.mockClear();

    render(BasicInfo);

    expect(mockEndTrace).toHaveBeenCalledTimes(4);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Deposit Continue Flow',
      data: {
        destination: 'BasicInfo',
      },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Deposit Input OTP',
      data: {
        destination: 'BasicInfo',
      },
    });
  });

  it('calls postKycForm and submitSsnDetails when continue is pressed with valid form data', async () => {
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

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });

    expect(mockPostKycForm).toHaveBeenCalledWith({
      personalDetails: {
        firstName: 'John',
        lastName: 'Smith',
        mobileNumber: '+1234567890',
        dob: '01-01-2024',
      },
    });
    expect(mockSubmitSsnDetails).toHaveBeenCalledWith({
      ssn: '123456789',
      quoteId: 'test-quote-id',
    });
  });

  it('handles form submission errors and displays error message', async () => {
    const errorMessage = 'API Error occurred';
    const mockError = new Error(errorMessage);
    mockPostKycForm.mockImplementationOnce(() => {
      throw mockError;
    });

    const mockLoggerError = jest.spyOn(Logger, 'error');
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

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText(errorMessage)).toBeOnTheScreen();
    expect(mockLoggerError).toHaveBeenCalledWith(
      mockError,
      'Unexpected error during basic info form submission',
    );
  });

  it('passes regions to DepositPhoneField component', () => {
    const customRegions = [...MOCK_REGIONS, MOCK_CA_REGION];

    mockUseRegions.mockReturnValue({
      regions: customRegions,
      isFetching: false,
      error: null,
    });
    render(BasicInfo);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
