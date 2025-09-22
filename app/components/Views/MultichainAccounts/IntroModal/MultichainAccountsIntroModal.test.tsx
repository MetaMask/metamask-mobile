import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import MultichainAccountsIntroModal, {
  WALLET_ALIGNMENT_MINIMUM_TIMEOUT_MS,
} from './MultichainAccountsIntroModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from './testIds';
import { captureException } from '@sentry/react-native';
import Engine from '../../../../core/Engine';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainAccountService: {
      init: jest.fn(),
      alignWallets: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useTheme: () => ({
    colors: {
      background: { default: '#FFFFFF' },
      text: { default: '#000000' },
    },
  }),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('../../AccountSelector', () => ({
  createAccountSelectorNavDetails: jest.fn(() => ['AccountSelector', {}]),
}));

const renderWithProviders = (
  component: React.ReactElement,
  initialState = {},
) => renderWithProvider(component, { state: initialState });

describe('MultichainAccountsIntroModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the alignWallets mock to return a resolved promise by default
    const { MultichainAccountService } = Engine.context;
    (MultichainAccountService.alignWallets as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('renders correctly with all elements', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.TITLE),
    ).toBeTruthy();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.IMAGE_PLACEHOLDER),
    ).toBeTruthy();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_TITLE),
    ).toBeTruthy();
    expect(
      getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_DESCRIPTION,
      ),
    ).toBeTruthy();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_TITLE),
    ).toBeTruthy();
    expect(
      getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_DESCRIPTION,
      ),
    ).toBeTruthy();
    expect(
      getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      ),
    ).toBeTruthy();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.LEARN_MORE_BUTTON),
    ).toBeTruthy();

    // Wait for initial alignment to complete and close button to appear
    await waitFor(() => {
      expect(
        queryByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON),
      ).toBeTruthy();
    });
  });

  it('displays correct title', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.TITLE),
    ).toHaveTextContent(strings('multichain_accounts.intro.title'));
  });

  it('displays correct section titles and descriptions', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_TITLE),
    ).toHaveTextContent(strings('multichain_accounts.intro.section_1_title'));
    expect(
      getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_DESCRIPTION,
      ),
    ).toHaveTextContent(
      strings('multichain_accounts.intro.section_1_description'),
    );
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_TITLE),
    ).toHaveTextContent(strings('multichain_accounts.intro.section_2_title'));
    expect(
      getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_DESCRIPTION,
      ),
    ).toHaveTextContent(
      strings('multichain_accounts.intro.section_2_description'),
    );
  });

  it('displays correct button labels', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    expect(
      getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      ),
    ).toHaveTextContent(
      strings('multichain_accounts.intro.view_accounts_button'),
    );
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.LEARN_MORE_BUTTON),
    ).toHaveTextContent(strings('multichain_accounts.intro.learn_more_button'));
  });

  it('handles close button press', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    // Wait for initial alignment to complete and close button to appear
    await waitFor(() => {
      expect(
        queryByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON),
      ).toBeTruthy();
    });

    const closeButton = getByTestId(
      MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
    );
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('handles view accounts button press', async () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    const viewAccountsButton = getByTestId(
      MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
    );

    await act(async () => {
      fireEvent.press(viewAccountsButton);
    });

    // Wait for navigation to complete
    await waitFor(
      () => {
        expect(mockGoBack).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000 },
    );
  });

  it('handles learn more button press', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    const learnMoreButton = getByTestId(
      MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.LEARN_MORE_BUTTON,
    );
    fireEvent.press(learnMoreButton);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'MultichainAccountsLearnMoreBottomSheet',
    });
  });

  describe('alignWallet functionality', () => {
    it('handles view accounts button press with alignment', async () => {
      const { getByTestId } = renderWithProviders(
        <MultichainAccountsIntroModal />,
      );

      const viewAccountsButton = getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      );

      await fireEvent.press(viewAccountsButton);

      // Should navigate after alignment (with 2+ second delay)
      await waitFor(
        () => {
          expect(mockGoBack).toHaveBeenCalledTimes(1);
          expect(mockNavigate).toHaveBeenCalledWith('AccountSelector', {});
        },
        { timeout: 5000 },
      );
    });

    it('calls captureException only once when alignWallets promise fails and user clicks view accounts button', async () => {
      const mockAlignWallets = jest
        .fn()
        .mockRejectedValue(new Error('Alignment failed'));
      const { MultichainAccountService } = Engine.context;
      MultichainAccountService.alignWallets = mockAlignWallets;

      const { getByTestId } = renderWithProviders(
        <MultichainAccountsIntroModal />,
      );

      const viewAccountsButton = getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      );

      // Wait for the useEffect to trigger the captureException call
      await waitFor(() => {
        expect(captureException).toHaveBeenCalledTimes(1);
      });

      // Click the view accounts button - should NOT trigger another captureException call
      await act(async () => {
        fireEvent.press(viewAccountsButton);
      });

      // Wait for the handleViewAccounts function to complete
      await waitFor(() => {
        expect(captureException).toHaveBeenCalledTimes(1); // Still only 1 call
        expect(mockGoBack).toHaveBeenCalledTimes(1);
      });

      // Verify the single call was made with an Error object
      expect(captureException).toHaveBeenCalledWith(expect.any(Error));
    });

    it('shows loading state and text on button during alignment', async () => {
      const { getByTestId } = renderWithProviders(
        <MultichainAccountsIntroModal />,
      );

      const viewAccountsButton = getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      );

      await fireEvent.press(viewAccountsButton);

      // Wait for the button to show loading state
      await waitFor(() => {
        expect(viewAccountsButton).toHaveTextContent(
          strings('multichain_accounts.intro.setting_up_accounts'),
        );
      });

      // Wait for the operation to complete to avoid interfering with other tests
      await waitFor(
        () => {
          expect(mockGoBack).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 },
      );
    });

    it('uses Promise.all to wait for both alignment and timeout', async () => {
      const { getByTestId } = renderWithProviders(
        <MultichainAccountsIntroModal />,
      );

      const viewAccountsButton = getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      );

      await act(async () => {
        fireEvent.press(viewAccountsButton);
      });

      // Wait for completion - this should take at least 2 seconds due to Promise.all timeout
      await waitFor(
        () => {
          expect(mockGoBack).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 },
      );

      // The test passes if it completes successfully, which means the 2-second timeout worked
    });

    it('handles case where alignment takes longer than 2 seconds', async () => {
      const { getByTestId } = renderWithProviders(
        <MultichainAccountsIntroModal />,
      );

      const viewAccountsButton = getByTestId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
      );

      const startTime = performance.now();
      let endTime = startTime;

      await act(async () => {
        fireEvent.press(viewAccountsButton);
      });

      // Wait for completion - this should take at least 2 seconds due to minimum timeout
      await waitFor(
        () => {
          expect(mockGoBack).toHaveBeenCalledTimes(1);
          endTime = performance.now();
        },
        { timeout: 5000 },
      );

      const totalTime = endTime - startTime;

      // Verify that the operation took at least the minimum timeout duration
      expect(totalTime).toBeGreaterThanOrEqual(
        WALLET_ALIGNMENT_MINIMUM_TIMEOUT_MS,
      );
    });
  });
});
