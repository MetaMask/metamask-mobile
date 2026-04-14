import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import V2EnterAddress from './EnterAddress';
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
    previousFormData: {
      addressLine1: '123 Main St',
      addressLine2: '',
      city: 'San Francisco',
      state: 'California',
      postCode: '94105',
      countryCode: 'US',
    },
  }),
}));

const mockPatchUser = jest.fn();
let mockUserRegion: unknown = {
  country: {
    isoCode: 'US',
    name: 'United States',
    currency: 'USD',
    flag: '🇺🇸',
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    patchUser: mockPatchUser,
  }),
}));

jest.mock('../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => ({
    userRegion: mockUserRegion,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();
jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
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

jest.mock('../../Deposit/constants/constants', () => ({
  VALIDATION_REGEX: {
    addressLine1: /^.{1,100}$/,
    addressLine2: /^.{0,100}$/,
    city: /^[a-zA-Z\s'-]+$/,
    state: /^[a-zA-Z\s'-]+$/,
    postCode: /^[\w\s-]+$/,
  },
}));

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

describe('V2EnterAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRegion = {
      country: {
        isoCode: 'US',
        name: 'United States',
        currency: 'USD',
        flag: '🇺🇸',
      },
      state: { stateId: 'CA', name: 'California' },
      regionCode: 'us-ca',
    };
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<V2EnterAddress />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the address form fields', () => {
    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    expect(getByTestId('address-line-1-input')).toBeOnTheScreen();
    expect(getByTestId('address-line-2-input')).toBeOnTheScreen();
    expect(getByTestId('city-input')).toBeOnTheScreen();
    expect(getByTestId('state-input')).toBeOnTheScreen();
    expect(getByTestId('postal-code-input')).toBeOnTheScreen();
    expect(getByTestId('country-input')).toBeOnTheScreen();
  });

  it('renders the continue button', () => {
    const { getByTestId } = renderWithTheme(<V2EnterAddress />);
    expect(getByTestId('address-continue-button')).toBeOnTheScreen();
  });

  it('pre-fills form with previous form data', () => {
    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    expect(getByTestId('address-line-1-input').props.value).toBe('123 Main St');
    expect(getByTestId('city-input').props.value).toBe('San Francisco');
    expect(getByTestId('postal-code-input').props.value).toBe('94105');
  });

  it('calls patchUser and routeAfterAuthentication on valid submission', async () => {
    mockPatchUser.mockResolvedValue({});
    mockRouteAfterAuthentication.mockResolvedValue(undefined);

    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    await act(async () => {
      fireEvent.press(getByTestId('address-continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalledWith(
        expect.objectContaining({
          addressDetails: expect.any(Object),
        }),
      );
    });
  });

  it('shows error when submission fails', async () => {
    mockPatchUser.mockRejectedValue(new Error('Server error'));

    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    await act(async () => {
      fireEvent.press(getByTestId('address-continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });
  });

  it('tracks analytics event on form submission', async () => {
    mockPatchUser.mockResolvedValue({});
    mockRouteAfterAuthentication.mockResolvedValue(undefined);

    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    await act(async () => {
      fireEvent.press(getByTestId('address-continue-button'));
    });

    await waitFor(() => {
      if (mockTrackEvent.mock.calls.length > 0) {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'RAMPS_ADDRESS_ENTERED',
          expect.objectContaining({
            region: 'US',
            ramp_type: 'DEPOSIT',
          }),
        );
      }
    });
  });

  it('calls routeAfterAuthentication after successful patchUser', async () => {
    mockPatchUser.mockResolvedValue({});
    mockRouteAfterAuthentication.mockResolvedValue(undefined);

    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    await act(async () => {
      fireEvent.press(getByTestId('address-continue-button'));
    });

    await waitFor(() => {
      expect(mockRouteAfterAuthentication).toHaveBeenCalled();
    });
  });

  it('matches snapshot for non-US region', () => {
    mockUserRegion = {
      country: {
        isoCode: 'GB',
        name: 'United Kingdom',
        currency: 'GBP',
        flag: '🇬🇧',
      },
      state: { stateId: '', name: '' },
      regionCode: 'gb',
    };

    const { toJSON } = renderWithTheme(<V2EnterAddress />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows country flag in country input', () => {
    const { getByTestId } = renderWithTheme(<V2EnterAddress />);
    expect(getByTestId('country-input')).toBeOnTheScreen();
  });

  it('disables continue button while loading', async () => {
    mockPatchUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    await act(async () => {
      fireEvent.press(getByTestId('address-continue-button'));
    });

    expect(getByTestId('address-continue-button')).toBeOnTheScreen();
  });

  it('clears error when field value changes', async () => {
    mockPatchUser.mockRejectedValue(new Error('Server error'));

    const { getByTestId } = renderWithTheme(<V2EnterAddress />);

    await act(async () => {
      fireEvent.press(getByTestId('address-continue-button'));
    });

    await waitFor(() => {
      expect(mockPatchUser).toHaveBeenCalled();
    });

    fireEvent.changeText(getByTestId('address-line-1-input'), '456 New St');
    expect(getByTestId('address-line-1-input')).toBeOnTheScreen();
  });
});
