import '../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { PUSH_PRE_PROMPT_SHOWN, TRUE } from '../../../constants/storage';
import storageWrapper from '../../../store/storage-wrapper';
import { createStateFixture } from '../../../../tests/component-view/stateFixture';
import { buildNotificationsState } from '../../../../tests/component-view/presets/notifications';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import OnboardingNotificationPermission from './OnboardingNotificationPermission';
import { OnboardingNotificationPermissionTestIds as IDs } from './OnboardingNotificationPermission.testIds';

const renderOnboarding = ({ isUnlocked = true, isSignedIn = true } = {}) => {
  const onComplete = jest.fn();
  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalAnalyticsController()
    .withOverrides(buildNotificationsState({ notificationsEnabled: false }))
    .withRemoteFeatureFlags({ assetsNotificationsEnabled: true })
    .withOverrides({
      security: { dataCollectionForMarketing: false },
      engine: {
        backgroundState: {
          KeyringController: { isUnlocked },
          AuthenticationController: { isSignedIn },
        },
      },
    })
    .build();
  return {
    ...renderComponentViewScreen(
      OnboardingNotificationPermission,
      { name: Routes.ONBOARDING.NOTIFICATION_PERMISSION },
      { state },
      { onComplete, shouldShowQuestionnaire: false },
    ),
    onComplete,
  };
};

describeForPlatforms('onboarding notification consent', () => {
  beforeEach(async () => {
    jest
      .mocked(
        Engine.context.NotificationServicesController
          .enableMetamaskNotifications,
      )
      .mockReset()
      .mockResolvedValue(undefined);
    jest.mocked(notifee.requestPermission).mockReset();
    await storageWrapper.removeItem(PUSH_PRE_PROMPT_SHOWN);
    Engine.context.KeyringController.state.isUnlocked = true;
    Object.assign(Engine.context.AuthenticationController, {
      state: { isSignedIn: true },
    });
    Engine.context.NotificationServicesController.state.isUpdatingMetamaskNotifications = false;
    jest.mocked(notifee.getNotificationSettings).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    } as Awaited<ReturnType<typeof notifee.getNotificationSettings>>);
  });

  afterEach(async () => {
    await storageWrapper.removeItem(PUSH_PRE_PROMPT_SHOWN);
  });

  it('enables existing OS permission only after explicit consent', async () => {
    const view = renderOnboarding();
    const enable = await view.findByTestId(IDs.ENABLE_BUTTON);
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(enable);
    });

    await waitFor(() => expect(view.onComplete).toHaveBeenCalledTimes(1));
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalledWith({
      hasMarketingConsent: true,
      productAnnouncementEnabled: true,
      registerPushNotifications: true,
    });
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      true,
    );
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBe(TRUE);
    expect(notifee.requestPermission).not.toHaveBeenCalled();
  });

  it('records Skip without enabling services or marketing', async () => {
    const view = renderOnboarding();
    const skip = await view.findByTestId(IDs.SKIP_BUTTON);

    await act(async () => {
      fireEvent.press(skip);
    });

    expect(view.onComplete).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).not.toHaveBeenCalled();
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      false,
    );
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBe(TRUE);
  });

  it('waits for an unlocked wallet before allowing Enable', async () => {
    const view = renderOnboarding({ isUnlocked: false });
    const enable = await view.findByTestId(IDs.ENABLE_BUTTON);

    await act(async () => {
      fireEvent.press(enable);
    });

    expect(view.onComplete).not.toHaveBeenCalled();
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).not.toHaveBeenCalled();
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      false,
    );
  });
  it('leaves notifications and marketing unchanged after native denial', async () => {
    jest.mocked(notifee.getNotificationSettings).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
    } as Awaited<ReturnType<typeof notifee.getNotificationSettings>>);
    jest.mocked(notifee.requestPermission).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    } as Awaited<ReturnType<typeof notifee.requestPermission>>);
    const view = renderOnboarding();
    const enable = await view.findByTestId(IDs.ENABLE_BUTTON);

    await act(async () => {
      fireEvent.press(enable);
    });

    expect(notifee.requestPermission).toHaveBeenCalledTimes(1);
    expect(view.onComplete).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).not.toHaveBeenCalled();
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      false,
    );
    expect(await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN)).toBe(TRUE);
  });

  it('allows retry after setup fails without granting marketing consent', async () => {
    jest
      .mocked(
        Engine.context.NotificationServicesController
          .enableMetamaskNotifications,
      )
      .mockRejectedValueOnce(new Error('setup failed'));
    const view = renderOnboarding();
    const enable = await view.findByTestId(IDs.ENABLE_BUTTON);

    await act(async () => {
      fireEvent.press(enable);
    });

    expect(await view.findByTestId(IDs.ERROR)).toBeOnTheScreen();
    expect(view.onComplete).not.toHaveBeenCalled();
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      false,
    );

    await act(async () => {
      fireEvent.press(view.getByTestId(IDs.ENABLE_BUTTON));
    });

    expect(view.onComplete).toHaveBeenCalledTimes(1);
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      true,
    );
  });
  it('finishes sign-in after explicit Enable before enabling services', async () => {
    Engine.context.AuthenticationController.state.isSignedIn = false;
    const signIn = jest.fn(async () => {
      Engine.context.AuthenticationController.state.isSignedIn = true;
    });
    Object.assign(Engine.context.AuthenticationController, {
      performSignIn: signIn,
    });
    const view = renderOnboarding({ isSignedIn: false });
    const enable = await view.findByTestId(IDs.ENABLE_BUTTON);

    await act(async () => {
      fireEvent.press(enable);
    });

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(view.onComplete).toHaveBeenCalledTimes(1);
    expect(view.store.getState().security.dataCollectionForMarketing).toBe(
      true,
    );
    expect(signIn.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(
        Engine.context.NotificationServicesController
          .enableMetamaskNotifications,
      ).mock.invocationCallOrder[0],
    );
  });
});
