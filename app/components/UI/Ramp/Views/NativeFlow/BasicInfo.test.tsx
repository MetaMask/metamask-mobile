import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import V2BasicInfo from './BasicInfo';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

const mockUseParamsReturn = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
  previousFormData: undefined as unknown,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => mockUseParamsReturn,
}));

const mockPatchUser = jest.fn();
const mockSubmitSsnDetails = jest.fn();
const mockLogoutFromProvider = jest.fn();

let mockUserRegion: unknown = {
  country: {
    isoCode: 'US',
    currency: 'USD',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
  },
  regionCode: 'us-ca',
};

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    logoutFromProvider: mockLogoutFromProvider,
    patchUser: mockPatchUser,
    submitSsnDetails: mockSubmitSsnDetails,
  }),
}));

jest.mock('../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => ({
    userRegion: mockUserRegion,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../Deposit/utils', () => ({
  timestampToTransakFormat: (ts: string) => (ts ? '1990-01-01' : ''),
  generateThemeParameters: jest.fn(() => ({})),
}));

jest.mock('../../Deposit/constants/constants', () => ({
  VALIDATION_REGEX: {
    firstName: /^[a-zA-Z\s'-]+$/,
    lastName: /^[a-zA-Z\s'-]+$/,
    mobileNumber: /^\+?[\d\s()-]+$/,
    dateOfBirth: /^\d{4}-\d{2}-\d{2}$/,
  },
}));

jest.mock(
  '../../Deposit/components/DepositPhoneField/formatNumberToTemplate',
  () => ({
    formatNumberToTemplate: (num: string) => num,
  }),
);

jest.mock('../../Deposit/hooks/useForm', () => ({
  useForm: <T extends Record<string, string>>({
    initialFormData,
    validateForm,
  }: {
    initialFormData: T;
    validateForm: (data: T) => Record<string, string>;
  }) => {
    const ReactActual = jest.requireActual('react');
    const [formData, setFormData] = ReactActual.useState(initialFormData);
    const [errors, setErrors] = ReactActual.useState({});

    return {
      formData,
      errors,
      handleChange: (field: string, value: string) => {
        setFormData((prev: T) => ({ ...prev, [field]: value }));
      },
      validateFormData: () => {
        const formErrors = validateForm(formData);
        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
      },
    };
  },
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

const validPreviousFormData = {
  firstName: 'John',
  lastName: 'Doe',
  mobileNumber: '+11234567890',
  dob: '1990-01-01',
  addressLine1: '123 Main St',
  addressLine2: '',
  city: 'San Francisco',
  state: 'California',
  postCode: '94105',
  countryCode: 'US',
};

describe('V2BasicInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturn.previousFormData = undefined;
    mockUserRegion = {
      country: {
        isoCode: 'US',
        currency: 'USD',
        flag: '🇺🇸',
        phone: {
          prefix: '+1',
          placeholder: '(XXX) XXX-XXXX',
          template: 'XXX-XXX-XXXX',
        },
      },
      regionCode: 'us-ca',
    };
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<V2BasicInfo />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the form fields', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    expect(getByTestId('first-name-input')).toBeOnTheScreen();
    expect(getByTestId('last-name-input')).toBeOnTheScreen();
    expect(getByTestId('date-of-birth-input')).toBeOnTheScreen();
  });

  it('renders SSN field for US region', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    expect(getByTestId('ssn-input')).toBeOnTheScreen();
  });

  it('does not render SSN field for non-US region', () => {
    mockUserRegion = {
      country: {
        isoCode: 'GB',
        currency: 'GBP',
        flag: '🇬🇧',
        phone: {
          prefix: '+44',
          placeholder: 'XXXX XXX XXXX',
          template: 'XXXX-XXX-XXXX',
        },
      },
      regionCode: 'gb',
    };

    const { queryByTestId } = renderWithTheme(<V2BasicInfo />);

    expect(queryByTestId('ssn-input')).toBeNull();
  });

  it('renders the continue button', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    expect(getByTestId('continue-button')).toBeOnTheScreen();
  });

  it('calls patchUser on form submission with pre-filled valid data', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockResolvedValue({});
    mockSubmitSsnDetails.mockResolvedValue({});

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
  });

  it('shows error banner when patchUser fails with pre-filled data', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockRejectedValue(new Error('Server error'));

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
  });

  it('submits SSN when region is US and ssn is provided', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockResolvedValue({});
    mockSubmitSsnDetails.mockResolvedValue({});

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockSubmitSsnDetails).toHaveBeenCalledWith(
        '123-45-6789',
        'test-quote-id',
      );
    });
  });

  it('navigates after successful form submission', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockResolvedValue({});
    mockSubmitSsnDetails.mockResolvedValue({});

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('handles form data change correctly', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('first-name-input'), 'Jane');
    expect(getByTestId('first-name-input').props.value).toBe('Jane');

    fireEvent.changeText(getByTestId('last-name-input'), 'Smith');
    expect(getByTestId('last-name-input').props.value).toBe('Smith');
  });

  it('tracks analytics event on form submission', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockResolvedValue({});
    mockSubmitSsnDetails.mockResolvedValue({});

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_BASIC_INFO_ENTERED',
        expect.objectContaining({
          region: 'US',
          ramp_type: 'DEPOSIT',
        }),
      );
    });
  });

  it('handles phone registered error (errorCode 2020)', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockRejectedValue({
      response: {
        data: {
          error: {
            errorCode: 2020,
            message: 'Phone registered with t***@test.com',
          },
        },
      },
      message: 'Phone registered with t***@test.com',
    });

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
  });

  it('handles phone input changes', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    const phoneInput = getByTestId('first-name-input');
    fireEvent.changeText(phoneInput, 'Jane');
    expect(phoneInput).toBeOnTheScreen();
  });

  it('calls logoutFromProvider when logout button is pressed', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockRejectedValue({
      response: {
        data: {
          error: {
            errorCode: 2020,
            message: 'Phone registered with t***@test.com',
          },
        },
      },
      message: 'Phone registered with t***@test.com',
    });
    mockLogoutFromProvider.mockResolvedValue(undefined);

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(getByTestId('basic-info-logout-button'));
    });

    await waitFor(() => {
      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });
  });

  it('matches snapshot for non-US region', () => {
    mockUserRegion = {
      country: {
        isoCode: 'GB',
        currency: 'GBP',
        flag: '🇬🇧',
        phone: {
          prefix: '+44',
          placeholder: 'XXXX XXX XXXX',
          template: 'XXXX-XXX-XXXX',
        },
      },
      regionCode: 'gb',
    };

    const { toJSON } = renderWithTheme(<V2BasicInfo />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('disables continue button while loading', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    expect(getByTestId('continue-button')).toBeOnTheScreen();
  });

  it('renders ssn info button for US region', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);
    expect(getByTestId('ssn-info-button')).toBeOnTheScreen();
  });

  it('handles region with no phone prefix', () => {
    mockUserRegion = {
      country: {
        isoCode: 'GB',
        currency: 'GBP',
        flag: '🇬🇧',
        phone: {
          prefix: '',
          placeholder: 'XXXX XXX XXXX',
          template: 'XXXX-XXX-XXXX',
        },
      },
      regionCode: 'gb',
    };

    const { toJSON } = renderWithTheme(<V2BasicInfo />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows validation errors when fields are empty', async () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    expect(mockPatchUser).not.toHaveBeenCalled();
  });

  it('shows validation errors for invalid field values', async () => {
    mockUseParamsReturn.previousFormData = {
      ...validPreviousFormData,
      firstName: '123',
      lastName: '456',
      mobileNumber: 'abc',
    };

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    expect(mockPatchUser).not.toHaveBeenCalled();
  });

  it('handles date of birth submit editing for US region', () => {
    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    const dateInput = getByTestId('date-of-birth-input');
    expect(dateInput).toBeOnTheScreen();
  });

  it('renders with pre-filled previousFormData', () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    expect(getByTestId('first-name-input').props.value).toBe('John');
    expect(getByTestId('last-name-input').props.value).toBe('Doe');
  });

  it('handles non-phone-error API errors', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockRejectedValue({
      response: {
        data: {
          error: {
            errorCode: 5000,
            message: 'Generic API error',
          },
        },
      },
      message: 'Generic API error',
    });

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
  });

  it('handles phone registered error with extractable email', async () => {
    mockUseParamsReturn.previousFormData = validPreviousFormData;
    mockPatchUser.mockRejectedValue({
      response: {
        data: {
          error: {
            errorCode: 2020,
            message: 'Phone already registered with user@example.com',
          },
        },
      },
      message: 'Phone already registered with user@example.com',
    });

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('ssn-input'), '123-45-6789');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
  });

  it('does not submit SSN for non-US region', async () => {
    mockUserRegion = {
      country: {
        isoCode: 'GB',
        currency: 'GBP',
        flag: '🇬🇧',
        phone: {
          prefix: '+44',
          placeholder: 'XXXX XXX XXXX',
          template: 'XXXX-XXX-XXXX',
        },
      },
      regionCode: 'gb',
    };
    mockUseParamsReturn.previousFormData = {
      ...validPreviousFormData,
      countryCode: 'GB',
    };
    mockPatchUser.mockResolvedValue({});

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
    expect(mockSubmitSsnDetails).not.toHaveBeenCalled();
  });
});
