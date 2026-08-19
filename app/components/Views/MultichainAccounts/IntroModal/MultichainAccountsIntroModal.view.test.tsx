import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../tests/component-view/render';
import {
  renderLearnMoreBottomSheet,
  renderMultichainAccountsIntroModal,
} from '../../../../../tests/component-view/renderers/multichainAccounts';
import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from './MultichainAccountsIntroModal.testIds';
import { LEARN_MORE_BOTTOM_SHEET_TEST_IDS } from './LearnMoreBottomSheet.testIds';

describeForPlatforms('Multichain accounts intro modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the intro content after wallet alignment completes', async () => {
    const alignWalletsSpy = jest.spyOn(
      Engine.context.MultichainAccountService,
      'alignWallets',
    );
    const { getByTestId, findByTestId } = renderMultichainAccountsIntroModal();

    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_TITLE),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(alignWalletsSpy).toHaveBeenCalled();

    alignWalletsSpy.mockRestore();
  });

  it('opens the multichain accounts learn-more URL in browser', async () => {
    const { getByTestId, findByTestId } = renderMultichainAccountsIntroModal();

    fireEvent.press(
      getByTestId(MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.LEARN_MORE_BUTTON),
    );

    const browserRouteParamsTestId = getRouteParamsProbeTestId(
      Routes.BROWSER.HOME,
    );

    expect(await findByTestId(browserRouteParamsTestId)).toBeOnTheScreen();
    await waitFor(() => {
      expect(getByTestId(browserRouteParamsTestId).props.children).toEqual(
        expect.stringContaining(AppConstants.URLS.MULTICHAIN_ACCOUNTS),
      );
    });
  });

  it('renders the learn-more bottom sheet and confirms after checking consent', async () => {
    const { getByTestId, findByTestId } = renderLearnMoreBottomSheet();

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON),
    ).toBeDisabled();

    fireEvent.press(getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX));
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON),
    ).toBeEnabled();

    fireEvent.press(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW)),
    ).toBeOnTheScreen();
  });
});
