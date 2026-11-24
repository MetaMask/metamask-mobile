import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import AdditionalDetailsNationality from './AdditionalDetailsNationality';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

const mockMetadata = {
  options: [] as { name: string; value: string }[],
  documentProofOptions: [],
  expiresAt: '',
  kycUrl: '',
  workFlowRunId: '',
  employmentStatusOptions: [
    { name: 'Employed', value: 'employed' },
    { name: 'Student', value: 'student' },
  ],
  countryOfCitizenshipOptions: [
    { name: 'Germany', value: 'DE' },
    { name: 'France', value: 'FR' },
  ],
};

const mockSubmitAdditionalDetailsNationality = jest.fn();
const mockGetKycRequirement = jest.fn();
const mockGetAdditionalRequirements = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    submitAdditionalDetailsNationality: mockSubmitAdditionalDetailsNationality,
    getKycRequirement: mockGetKycRequirement,
    getAdditionalRequirements: mockGetAdditionalRequirements,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();
const mockUseTransakRouting = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: (config: unknown) => {
    mockUseTransakRouting(config);
    return { routeAfterAuthentication: mockRouteAfterAuthentication };
  },
}));

const mockUseParamsReturn: {
  quote: { quoteId: string };
  quoteId: string;
  metadata: typeof mockMetadata;
  headlessSessionId: string | undefined;
} = {
  quote: { quoteId: 'test-quote-id' },
  quoteId: 'test-quote-id',
  metadata: mockMetadata,
  headlessSessionId: undefined,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => mockUseParamsReturn,
  navigateWithDetails: (
    navigation: { navigate: (...args: unknown[]) => void },
    details: unknown[],
  ) => navigation.navigate(...details),
  resetWithRoutes: (
    navigation: { reset: (state: unknown) => void },
    _state: unknown,
  ) => navigation.reset(_state),
}));

const EMPLOYMENT_SELECT = 'nationality-employment-status-select';
const COUNTRY_SELECT = 'nationality-country-of-citizenship-select';

describe('AdditionalDetailsNationality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturn.metadata = mockMetadata;
    mockUseParamsReturn.headlessSessionId = undefined;
    mockSubmitAdditionalDetailsNationality.mockResolvedValue({
      status: 'SUBMITTED',
    });
    mockGetKycRequirement.mockResolvedValue(undefined);
    mockGetAdditionalRequirements.mockResolvedValue(undefined);
  });

  const renderScreen = () =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <AdditionalDetailsNationality />
      </ThemeContext.Provider>,
    );

  const selectOption = (
    utils: ReturnType<typeof renderScreen>,
    testID: string,
    value: string,
  ): void => {
    mockNavigate.mockClear();
    fireEvent.press(utils.getByTestId(testID));
    const params = mockNavigate.mock.calls[0][1] as {
      onSelect: (selected: string) => void;
    };
    act(() => {
      params.onSelect(value);
    });
  };

  const pressContinue = async (
    utils: ReturnType<typeof renderScreen>,
  ): Promise<void> => {
    await act(async () => {
      fireEvent.press(
        utils.getByText('deposit.source_of_income.continue_button'),
      );
    });
  };

  const fillForm = (utils: ReturnType<typeof renderScreen>): void => {
    selectOption(utils, EMPLOYMENT_SELECT, 'employed');
    selectOption(utils, COUNTRY_SELECT, 'DE');
  };

  it('renders the title and both pickers', () => {
    const { getByText, getByTestId } = renderScreen();

    expect(
      getByText('deposit.additional_details_nationality.title'),
    ).toBeOnTheScreen();
    expect(getByTestId(EMPLOYMENT_SELECT)).toBeOnTheScreen();
    expect(getByTestId(COUNTRY_SELECT)).toBeOnTheScreen();
  });

  it('opens the option selector with employment status options', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(EMPLOYMENT_SELECT));

    expect(mockNavigate).toHaveBeenCalledWith(
      'MockRoute',
      expect.objectContaining({
        title: 'deposit.source_of_income.employment_status_label',
        options: mockMetadata.employmentStatusOptions,
      }),
    );
  });

  it('opens the option selector with country of citizenship options', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(COUNTRY_SELECT));

    expect(mockNavigate).toHaveBeenCalledWith(
      'MockRoute',
      expect.objectContaining({
        title: 'deposit.source_of_income.nationality_label',
        options: mockMetadata.countryOfCitizenshipOptions,
      }),
    );
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('deposit-back-navbar-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when the close button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('deposit-close-navbar-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not submit until both fields are selected', async () => {
    const utils = renderScreen();
    selectOption(utils, EMPLOYMENT_SELECT, 'employed');

    await pressContinue(utils);

    expect(mockSubmitAdditionalDetailsNationality).not.toHaveBeenCalled();
  });

  it('submits the selected values and continues the KYC flow', async () => {
    const utils = renderScreen();
    fillForm(utils);

    await pressContinue(utils);

    expect(mockSubmitAdditionalDetailsNationality).toHaveBeenCalledWith(
      'employed',
      'DE',
    );
    expect(mockGetKycRequirement).toHaveBeenCalledWith('test-quote-id');
    expect(mockGetAdditionalRequirements).toHaveBeenCalledWith('test-quote-id');
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(
      mockUseParamsReturn.quote,
    );
  });

  it('shows an error and stops when the submission fails', async () => {
    mockSubmitAdditionalDetailsNationality.mockResolvedValue({
      status: 'FAILED',
    });
    const utils = renderScreen();
    fillForm(utils);

    await pressContinue(utils);

    expect(
      utils.getByText('deposit.additional_details_nationality.submitError'),
    ).toBeOnTheScreen();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('shows an error when the submission throws', async () => {
    mockSubmitAdditionalDetailsNationality.mockRejectedValue(new Error('boom'));
    const utils = renderScreen();
    fillForm(utils);

    await pressContinue(utils);

    expect(utils.getByText('deposit.mica.errorTitle')).toBeOnTheScreen();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('shows the missing fields banner when options are absent', () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      employmentStatusOptions: [],
    };

    const { getByText } = renderScreen();

    expect(
      getByText('deposit.source_of_income.fields_missing_title'),
    ).toBeOnTheScreen();
  });

  it('does not show the missing fields banner when options are present', () => {
    const { queryByText } = renderScreen();

    expect(
      queryByText('deposit.source_of_income.fields_missing_title'),
    ).not.toBeOnTheScreen();
  });

  it('refetches the form and re-navigates, keeping the headless session', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      countryOfCitizenshipOptions: [],
    };
    mockUseParamsReturn.headlessSessionId = 'headless-1';
    const freshMetadata = {
      employmentStatusOptions: [{ name: 'Employed', value: 'employed' }],
      countryOfCitizenshipOptions: [{ name: 'Germany', value: 'DE' }],
    };
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [
        { type: 'ADDITIONAL_DETAILS_NATIONALITY', metadata: freshMetadata },
      ],
    });

    const { getByText } = renderScreen();
    fireEvent.press(getByText('deposit.mica.retry_button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampAdditionalDetailsNationality',
        expect.objectContaining({
          quoteId: 'test-quote-id',
          metadata: freshMetadata,
          headlessSessionId: 'headless-1',
        }),
      );
    });
  });

  it('shows an error when refetching the form fails', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      countryOfCitizenshipOptions: [],
    };
    mockGetAdditionalRequirements.mockRejectedValue(new Error('network down'));

    const { getByText, findByText } = renderScreen();
    fireEvent.press(getByText('deposit.mica.retry_button'));

    expect(await findByText('deposit.mica.errorTitle')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the retry action available after a failed refetch', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      countryOfCitizenshipOptions: [],
    };
    mockGetAdditionalRequirements.mockRejectedValue(new Error('network down'));

    const { getByText, findByText } = renderScreen();
    fireEvent.press(getByText('deposit.mica.retry_button'));
    await findByText('deposit.mica.errorTitle');

    mockGetAdditionalRequirements.mockClear();
    fireEvent.press(getByText('deposit.mica.retry_button'));

    await waitFor(() => {
      expect(mockGetAdditionalRequirements).toHaveBeenCalledTimes(1);
    });
  });

  it('routes back to the headless host when a headless session is active', () => {
    mockUseParamsReturn.headlessSessionId = 'headless-1';

    renderScreen();

    expect(mockUseTransakRouting).toHaveBeenCalledWith(
      expect.objectContaining({
        baseRoute: 'RampHeadlessHost',
        baseRouteParams: { headlessSessionId: 'headless-1' },
      }),
    );
  });

  it('does not override the base route outside headless flows', () => {
    renderScreen();

    expect(mockUseTransakRouting.mock.calls[0][0].baseRoute).toBeUndefined();
  });
});
