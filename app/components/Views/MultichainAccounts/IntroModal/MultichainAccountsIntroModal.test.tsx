import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import MultichainAccountsIntroModal from './MultichainAccountsIntroModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from './testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

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
  });

  it('renders correctly with all elements', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.TITLE),
    ).toBeTruthy();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON),
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

  it('handles close button press', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    const closeButton = getByTestId(
      MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
    );
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('handles view accounts button press', () => {
    const { getByTestId } = renderWithProviders(
      <MultichainAccountsIntroModal />,
    );

    const viewAccountsButton = getByTestId(
      MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON,
    );
    fireEvent.press(viewAccountsButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
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
});
