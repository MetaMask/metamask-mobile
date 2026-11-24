import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import SourceOfIncome from './SourceOfIncome';
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

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (_amount: number, currency: string) =>
      currency === 'EUR' ? '€0.00' : `${currency}0.00`,
  }),
}));

const mockMetadata = {
  options: [] as { name: string; value: string }[],
  documentProofOptions: [],
  expiresAt: '',
  kycUrl: '',
  workFlowRunId: '',
  sourceOfFundsTypeOptions: [
    { name: 'Salary payments', value: 'salary_payment' },
    { name: 'Savings', value: 'savings' },
  ],
};

const mockSubmitSourceOfIncome = jest.fn().mockResolvedValue({
  status: 'SUBMITTED',
});

const mockGetKycRequirement = jest.fn();
const mockGetAdditionalRequirements = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    submitSourceOfIncome: mockSubmitSourceOfIncome,
    getKycRequirement: mockGetKycRequirement,
    getAdditionalRequirements: mockGetAdditionalRequirements,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();
const mockUseTransakRouting = jest.fn();
const mockLayoutProps = jest.fn();

// Render the real layout but expose its props, so the submit handler can be
// invoked directly (the disabled footer button never fires it).
jest.mock('./MicaKycFormLayout', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('./MicaKycFormLayout');
  return {
    __esModule: true,
    ...actual,
    default: (props: Record<string, unknown>): unknown => {
      mockLayoutProps(props);
      return ReactActual.createElement(actual.default, props);
    },
  };
});

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: (config: unknown) => {
    mockUseTransakRouting(config);
    return { routeAfterAuthentication: mockRouteAfterAuthentication };
  },
}));

const mockUseParamsReturn: {
  quote: { quoteId: string; fiatAmount: number; fiatCurrency?: string };
  quoteId: string;
  metadata: typeof mockMetadata;
  headlessSessionId: string | undefined;
} = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100, fiatCurrency: 'EUR' },
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

describe('SourceOfIncome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturn.metadata = mockMetadata;
    mockUseParamsReturn.headlessSessionId = undefined;
    mockUseParamsReturn.quote = {
      quoteId: 'test-quote-id',
      fiatAmount: 100,
      fiatCurrency: 'EUR',
    };
    mockSubmitSourceOfIncome.mockResolvedValue({ status: 'SUBMITTED' });
    mockGetKycRequirement.mockResolvedValue(undefined);
    mockGetAdditionalRequirements.mockResolvedValue(undefined);
  });

  const renderScreen = () =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

  it('renders the title and subtitle copy', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.source_of_income.title')).toBeOnTheScreen();
      expect(getByText('deposit.source_of_income.subtitle')).toBeOnTheScreen();
    });
  });

  it('renders monthly volume and source of funds only', async () => {
    const { getByText, queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.source_of_income.monthly_volume_label'),
      ).toBeOnTheScreen();
      expect(
        getByText('deposit.source_of_income.source_of_funds_label'),
      ).toBeOnTheScreen();
      expect(
        queryByText('deposit.source_of_income.employment_status_label'),
      ).not.toBeOnTheScreen();
      expect(
        queryByText('deposit.source_of_income.nationality_label'),
      ).not.toBeOnTheScreen();
    });
  });

  it('shows the fiat currency symbol inside the monthly volume field', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('€')).toBeOnTheScreen();
    });
  });

  it('uses the estimate hint as the monthly volume placeholder', async () => {
    const { getByPlaceholderText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByPlaceholderText(
          'deposit.source_of_income.monthly_volume_placeholder',
        ),
      ).toBeOnTheScreen();
    });
  });

  it('opens the option selector sheet with the source of funds options', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('source-of-income-source-of-funds-select'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'MockRoute',
      expect.objectContaining({
        title: 'deposit.source_of_income.source_of_funds_label',
        options: mockMetadata.sourceOfFundsTypeOptions,
      }),
    );
  });

  it('does not show the missing fields banner when options are present', () => {
    const { queryByText } = renderScreen();

    expect(
      queryByText('deposit.source_of_income.fields_missing_title'),
    ).not.toBeOnTheScreen();
  });

  it('shows the missing fields banner when source of funds options are absent', () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      sourceOfFundsTypeOptions: [],
    };

    const { getByText } = renderScreen();

    expect(
      getByText('deposit.source_of_income.fields_missing_title'),
    ).toBeOnTheScreen();
    expect(
      getByText('deposit.source_of_income.source_of_funds_missing_description'),
    ).toBeOnTheScreen();
  });

  it('refetches the form and re-navigates when retrying', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      sourceOfFundsTypeOptions: [],
    };
    const freshMetadata = {
      sourceOfFundsTypeOptions: [{ name: 'Savings', value: 'savings' }],
    };
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [{ type: 'SOURCE_OF_INCOME', metadata: freshMetadata }],
    });

    const { getByText } = renderScreen();
    fireEvent.press(getByText('deposit.mica.retry_button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampSourceOfIncome',
        expect.objectContaining({
          quoteId: 'test-quote-id',
          metadata: freshMetadata,
        }),
      );
    });
  });

  it('shows an error when retrying fails', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      sourceOfFundsTypeOptions: [],
    };
    mockGetAdditionalRequirements.mockRejectedValue(new Error('network down'));

    const { getByText, findByText } = renderScreen();
    fireEvent.press(getByText('deposit.mica.retry_button'));

    expect(await findByText('deposit.mica.errorTitle')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the retry action available after a failed retry', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      sourceOfFundsTypeOptions: [],
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

    const config = mockUseTransakRouting.mock.calls[0][0];
    expect(config.baseRoute).toBeUndefined();
  });

  const fillAndSubmit = async (
    utils: ReturnType<typeof renderScreen>,
  ): Promise<void> => {
    fireEvent.changeText(
      utils.getByTestId('source-of-income-monthly-volume-input'),
      '1000',
    );
    fireEvent.press(
      utils.getByTestId('source-of-income-source-of-funds-select'),
    );
    const params = mockNavigate.mock.calls[0][1] as {
      onSelect: (value: string) => void;
    };
    act(() => {
      params.onSelect('savings');
    });
    await act(async () => {
      fireEvent.press(
        utils.getByText('deposit.source_of_income.continue_button'),
      );
    });
  };

  it('submits the selected values and continues the KYC flow', async () => {
    const utils = renderScreen();

    await fillAndSubmit(utils);

    expect(mockSubmitSourceOfIncome).toHaveBeenCalledWith('1000', 'savings');
    expect(mockGetKycRequirement).toHaveBeenCalledWith('test-quote-id');
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(
      mockUseParamsReturn.quote,
    );
  });

  it('shows an error and stops when the submission fails', async () => {
    mockSubmitSourceOfIncome.mockResolvedValue({ status: 'FAILED' });
    const utils = renderScreen();

    await fillAndSubmit(utils);

    expect(
      utils.getByText('deposit.mica.sourceOfIncomeSubmitError'),
    ).toBeOnTheScreen();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('shows an error when the submission throws', async () => {
    mockSubmitSourceOfIncome.mockRejectedValue(new Error('boom'));
    const utils = renderScreen();

    await fillAndSubmit(utils);

    expect(utils.getByText('deposit.mica.errorTitle')).toBeOnTheScreen();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('renders the continue button', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.source_of_income.continue_button'),
      ).toBeOnTheScreen();
    });
  });

  it('shows the missing fields banner when the metadata has no source of funds options', () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      sourceOfFundsTypeOptions: undefined as never,
    };

    const { getByText } = renderScreen();

    expect(
      getByText('deposit.source_of_income.fields_missing_title'),
    ).toBeOnTheScreen();
  });

  it('does not render a currency symbol when the quote has no fiat currency', () => {
    mockUseParamsReturn.quote = { quoteId: 'test-quote-id', fiatAmount: 100 };

    const { queryByText } = renderScreen();

    expect(queryByText('€')).not.toBeOnTheScreen();
  });

  describe('input validation', () => {
    const selectSourceOfFunds = (
      utils: ReturnType<typeof renderScreen>,
    ): void => {
      fireEvent.press(
        utils.getByTestId('source-of-income-source-of-funds-select'),
      );
      const params = mockNavigate.mock.calls[0][1] as {
        onSelect: (value: string) => void;
      };
      act(() => {
        params.onSelect('savings');
      });
    };

    it.each([['0'], ['-25'], ['abc']])(
      'rejects a monthly volume of "%s" without submitting',
      async (volume) => {
        const utils = renderScreen();
        fireEvent.changeText(
          utils.getByTestId('source-of-income-monthly-volume-input'),
          volume,
        );
        selectSourceOfFunds(utils);

        await act(async () => {
          fireEvent.press(
            utils.getByText('deposit.source_of_income.continue_button'),
          );
        });

        expect(
          utils.getByText('deposit.mica.monthlyVolumeInvalid'),
        ).toBeOnTheScreen();
        expect(mockSubmitSourceOfIncome).not.toHaveBeenCalled();
        expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
      },
    );

    it('clears a previous validation error when the form is submitted again', async () => {
      const utils = renderScreen();
      const volumeInput = utils.getByTestId(
        'source-of-income-monthly-volume-input',
      );
      fireEvent.changeText(volumeInput, '0');
      selectSourceOfFunds(utils);
      await act(async () => {
        fireEvent.press(
          utils.getByText('deposit.source_of_income.continue_button'),
        );
      });
      expect(
        utils.getByText('deposit.mica.monthlyVolumeInvalid'),
      ).toBeOnTheScreen();

      fireEvent.changeText(volumeInput, '500');
      await act(async () => {
        fireEvent.press(
          utils.getByText('deposit.source_of_income.continue_button'),
        );
      });

      expect(
        utils.queryByText('deposit.mica.monthlyVolumeInvalid'),
      ).not.toBeOnTheScreen();
      expect(mockSubmitSourceOfIncome).toHaveBeenCalledWith('500', 'savings');
    });

    it('requires a monthly volume when the handler runs with an empty field', async () => {
      const utils = renderScreen();

      await act(async () => {
        await mockLayoutProps.mock.lastCall?.[0].onSubmit();
      });

      expect(
        utils.getByText('deposit.mica.monthlyVolumeInvalid'),
      ).toBeOnTheScreen();
      expect(mockSubmitSourceOfIncome).not.toHaveBeenCalled();
    });

    it('requires a source of funds when the handler runs without one selected', async () => {
      const utils = renderScreen();
      fireEvent.changeText(
        utils.getByTestId('source-of-income-monthly-volume-input'),
        '1000',
      );

      await act(async () => {
        await mockLayoutProps.mock.lastCall?.[0].onSubmit();
      });

      expect(
        utils.getByText('deposit.mica.sourceOfFundsRequired'),
      ).toBeOnTheScreen();
      expect(mockSubmitSourceOfIncome).not.toHaveBeenCalled();
      expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
    });
  });
});
