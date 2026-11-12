import '../../../../../tests/component-view/mocks';
import {
  renderPushPrePrompt,
  PUSH_PRE_PROMPT_NAV_TEST_IDS,
} from '../../../../../tests/component-view/renderers/pushPrePrompt';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { PUSH_PRE_PROMPT_SHOWN, TRUE } from '../../../../constants/storage';
import storageWrapper from '../../../../store/storage-wrapper';
import { NewUserSheetSelectorsIDs } from './NewUserSheet/NewUserSheet.testIds';
import { beginHomeNavigationHandoff } from '../../../../util/navigation/homeNavigationHandoff';

describeForPlatforms('push pre-prompt session', () => {
  beforeEach(async () => {
    await storageWrapper.removeItem(PUSH_PRE_PROMPT_SHOWN);
    jest.mocked(notifee.getNotificationSettings).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
    } as Awaited<ReturnType<typeof notifee.getNotificationSettings>>);
  });

  afterEach(async () => {
    await storageWrapper.removeItem(PUSH_PRE_PROMPT_SHOWN);
  });

  it('resumes an unanswered prompt after a covering route without consuming it', async () => {
    const view = renderPushPrePrompt();
    await waitFor(() =>
      expect(
        view.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );

    act(() =>
      view.navigation.navigate(Routes.ONBOARDING.HOME_NAV, {
        screen: Routes.REWARDS_VIEW,
      }),
    );

    await waitFor(() =>
      expect(
        view.getByTestId(PUSH_PRE_PROMPT_NAV_TEST_IDS.COVER),
      ).toBeOnTheScreen(),
    );
    expect(
      view.queryByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
    ).not.toBeOnTheScreen();
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBeNull();

    act(() => view.navigation.goBack());

    await waitFor(() =>
      expect(
        view.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );
  });

  it('asks on the next mount when killed before an answer', async () => {
    const first = renderPushPrePrompt();
    await waitFor(() =>
      expect(
        first.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );

    first.unmount();
    const second = renderPushPrePrompt();

    await waitFor(() =>
      expect(
        second.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBeNull();
  });

  it('asks after restart when the previous session ended before eligibility', async () => {
    const first = renderPushPrePrompt(false);
    await waitFor(() =>
      expect(
        first.getByTestId(PUSH_PRE_PROMPT_NAV_TEST_IDS.HOME),
      ).toBeOnTheScreen(),
    );
    expect(
      first.queryByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
    ).not.toBeOnTheScreen();

    first.unmount();
    const second = renderPushPrePrompt();

    await waitFor(() =>
      expect(
        second.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBeNull();
  });

  it('persists Not now before the close animation', async () => {
    const first = renderPushPrePrompt();
    await waitFor(() =>
      expect(
        first.getByTestId(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW),
      ).toBeOnTheScreen(),
    );

    fireEvent.press(first.getByTestId(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW));

    // CV enables test overrides, which intentionally disable synchronous MMKV
    // reads. Restart suppression is covered by the focused hook contract test.
    await waitFor(async () =>
      expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBe(TRUE),
    );
  });

  it('blocks a pending prompt throughout a delayed destination handoff', async () => {
    const view = renderPushPrePrompt();
    await waitFor(() =>
      expect(
        view.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );
    let run!: ReturnType<typeof beginHomeNavigationHandoff>;

    act(() => {
      run = beginHomeNavigationHandoff();
    });

    expect(
      view.queryByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
    ).not.toBeOnTheScreen();
    let finish: () => void = () => undefined;
    const prerequisite = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const action = run.run(async () => {
      await prerequisite;
      view.navigation.navigate(Routes.ONBOARDING.HOME_NAV, {
        screen: Routes.REWARDS_VIEW,
      });
    });

    await act(async () => {
      finish();
      await action;
    });

    await waitFor(() =>
      expect(
        view.getByTestId(PUSH_PRE_PROMPT_NAV_TEST_IDS.COVER),
      ).toBeOnTheScreen(),
    );
    expect(
      view.queryByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
    ).not.toBeOnTheScreen();
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBeNull();
    act(() => view.navigation.goBack());
    await waitFor(() =>
      expect(
        view.getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES),
      ).toBeOnTheScreen(),
    );
  });
});
