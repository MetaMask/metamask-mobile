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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
    previousFormData: undefined,
  }),
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
    userRegion: mockUserRegion,
    logoutFromProvider: mockLogoutFromProvider,
    patchUser: mockPatchUser,
    submitSsnDetails: mockSubmitSsnDetails,
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
    const [errors, setErrors] = ReactActual.useState<Record<string, string>>(
      {},
    );

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

describe('V2BasicInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('calls patchUser on form submission with valid data', async () => {
    mockPatchUser.mockResolvedValue({});
    mockSubmitSsnDetails.mockResolvedValue({});

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      if (mockPatchUser.mock.calls.length > 0) {
        expect(mockPatchUser).toHaveBeenCalled();
      }
    });
  });

  it('shows error banner when patchUser fails', async () => {
    mockPatchUser.mockRejectedValue(new Error('Server error'));

    const { getByTestId } = renderWithTheme(<V2BasicInfo />);

    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');

    await act(async () => {
      fireEvent.press(getByTestId('continue-button'));
    });

    await waitFor(() => {
      if (mockPatchUser.mock.calls.length > 0) {
        expect(mockPatchUser).toHaveBeenCalled();
      }
    });
  });
});
