import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SubscriptionDeveloperOptionsSection, {
  SUBSCRIPTION_DEV_TEST_IDS,
} from './SubscriptionDeveloperOptionsSection';
import useSubscriptions from '../../../hooks/useSubscriptions';

jest.mock('../../../hooks/useSubscriptions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockCustomerId = 'cus_123';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      engine: {
        backgroundState: {
          SubscriptionController: { customerId: mockCustomerId },
        },
      },
    }),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return { ...actual, useTheme: () => actual.mockTheme };
});

const mockSetString = jest.fn((_str: string) => Promise.resolve());

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: (str: string) => mockSetString(str) },
}));

const mockUseSubscriptions = jest.mocked(useSubscriptions);
const mockRefetch = jest.fn();

const SUBSCRIPTIONS = [
  {
    id: 'sub_1',
    status: 'active',
    products: [{ name: 'money_account_plus' }],
  },
];

const setupQuery = (overrides: Record<string, unknown> = {}) => {
  mockUseSubscriptions.mockReturnValue({
    data: SUBSCRIPTIONS,
    error: null,
    isFetching: false,
    isEnabled: true,
    refetch: mockRefetch,
    dataUpdatedAt: 0,
    ...overrides,
  } as unknown as ReturnType<typeof useSubscriptions>);
};

describe('SubscriptionDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders customer ID and summary, and hides JSON until toggled', () => {
    setupQuery();

    const { getByText, queryByTestId, getByTestId } = render(
      <SubscriptionDeveloperOptionsSection />,
    );

    expect(getByText('Customer ID: cus_123')).toBeOnTheScreen();
    expect(getByText('sub_1 · active · money_account_plus')).toBeOnTheScreen();
    expect(queryByTestId(SUBSCRIPTION_DEV_TEST_IDS.JSON)).toBeNull();

    fireEvent.press(getByTestId(SUBSCRIPTION_DEV_TEST_IDS.TOGGLE_JSON_BUTTON));

    expect(getByTestId(SUBSCRIPTION_DEV_TEST_IDS.JSON)).toHaveTextContent(
      JSON.stringify(SUBSCRIPTIONS, null, 2),
    );
  });

  it('renders the fetch error', () => {
    setupQuery({ data: undefined, error: new Error('Unauthorized') });

    const { getByText } = render(<SubscriptionDeveloperOptionsSection />);

    expect(getByText('Error: Unauthorized')).toBeOnTheScreen();
    expect(getByText('No subscriptions')).toBeOnTheScreen();
  });

  it('refetches on refresh and copies JSON on copy', () => {
    setupQuery();

    const { getByTestId } = render(<SubscriptionDeveloperOptionsSection />);
    fireEvent.press(getByTestId(SUBSCRIPTION_DEV_TEST_IDS.REFRESH_BUTTON));
    fireEvent.press(getByTestId(SUBSCRIPTION_DEV_TEST_IDS.COPY_JSON_BUTTON));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockSetString).toHaveBeenCalledWith(
      JSON.stringify(SUBSCRIPTIONS, null, 2),
    );
  });

  it('disables copy until a fetch has returned data', () => {
    setupQuery({ data: undefined });

    const { getByTestId, rerender } = render(
      <SubscriptionDeveloperOptionsSection />,
    );

    expect(
      getByTestId(SUBSCRIPTION_DEV_TEST_IDS.COPY_JSON_BUTTON),
    ).toBeDisabled();

    setupQuery({ data: [] });
    rerender(<SubscriptionDeveloperOptionsSection />);

    expect(
      getByTestId(SUBSCRIPTION_DEV_TEST_IDS.COPY_JSON_BUTTON),
    ).toBeEnabled();
  });

  it('disables refresh when the query is not enabled', () => {
    setupQuery({ isEnabled: false });

    const { getByTestId } = render(<SubscriptionDeveloperOptionsSection />);

    expect(
      getByTestId(SUBSCRIPTION_DEV_TEST_IDS.REFRESH_BUTTON),
    ).toBeDisabled();
  });
});
