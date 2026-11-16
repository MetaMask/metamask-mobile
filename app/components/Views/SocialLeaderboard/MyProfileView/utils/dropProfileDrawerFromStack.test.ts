import type { NavigationState } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { dropProfileDrawerFromStack } from './dropProfileDrawerFromStack';

const createStackState = (
  routeNames: string[],
  index = routeNames.length - 1,
): NavigationState => ({
  key: 'stack',
  index,
  routeNames,
  routes: routeNames.map((name, i) => ({
    key: `${name}-${i}`,
    name,
  })),
  type: 'stack',
  stale: false,
});

describe('dropProfileDrawerFromStack', () => {
  it('drops the drawer so the profile sits directly on the home tab', () => {
    // Arrange
    const state = createStackState([
      Routes.HOME_TABS,
      Routes.SOCIAL_PROFILE.DRAWER,
      Routes.SOCIAL.V1_PROFILE,
    ]);

    // Act
    const nextState = dropProfileDrawerFromStack(state);

    // Assert
    expect(nextState?.routes).toEqual([
      { key: `${Routes.HOME_TABS}-0`, name: Routes.HOME_TABS },
      {
        key: `${Routes.SOCIAL.V1_PROFILE}-2`,
        name: Routes.SOCIAL.V1_PROFILE,
      },
    ]);
    expect(nextState?.index).toBe(1);
  });

  it('keeps the focused screen even when a route below it is removed', () => {
    // Arrange
    const state = createStackState([
      Routes.HOME_TABS,
      Routes.SOCIAL_PROFILE.DRAWER,
      Routes.SOCIAL.V1_PROFILE,
    ]);

    // Act
    const nextState = dropProfileDrawerFromStack(state);

    // Assert
    expect(nextState?.index).toBe(1);
    expect(nextState?.routes?.[1]).toEqual(
      expect.objectContaining({ name: Routes.SOCIAL.V1_PROFILE }),
    );
  });

  it('preserves route keys so retained native screens are not remounted', () => {
    // Arrange
    const state = createStackState([
      Routes.HOME_TABS,
      Routes.SOCIAL_PROFILE.DRAWER,
      Routes.SOCIAL.V1_PROFILE,
    ]);

    // Act
    const nextState = dropProfileDrawerFromStack(state);

    // Assert
    expect(nextState?.routes?.map((route) => route.key)).toEqual([
      `${Routes.HOME_TABS}-0`,
      `${Routes.SOCIAL.V1_PROFILE}-2`,
    ]);
  });

  it('preserves the home route nested tab state', () => {
    // Arrange
    const homeState = {
      index: 1,
      routes: [{ name: Routes.WALLET.HOME }, { name: Routes.SOCIAL.TAB }],
    };
    const state: NavigationState = {
      ...createStackState([
        Routes.HOME_TABS,
        Routes.SOCIAL_PROFILE.DRAWER,
        Routes.SOCIAL.V1_PROFILE,
      ]),
      routes: [
        {
          key: `${Routes.HOME_TABS}-0`,
          name: Routes.HOME_TABS,
          state: homeState,
        },
        { key: 'drawer-1', name: Routes.SOCIAL_PROFILE.DRAWER },
        { key: 'profile-2', name: Routes.SOCIAL.V1_PROFILE },
      ],
    };

    // Act
    const nextState = dropProfileDrawerFromStack(state);

    // Assert
    expect(nextState?.routes?.[0]).toEqual(
      expect.objectContaining({
        name: Routes.HOME_TABS,
        state: homeState,
      }),
    );
  });

  it('does nothing when the profile was opened without the drawer', () => {
    // Arrange
    const state = createStackState([
      Routes.HOME_TABS,
      Routes.SOCIAL.V1_PROFILE,
    ]);

    // Act
    const nextState = dropProfileDrawerFromStack(state);

    // Assert
    expect(nextState).toBeUndefined();
  });

  it('does nothing when the drawer is the only route', () => {
    // Arrange
    const state = createStackState([Routes.SOCIAL_PROFILE.DRAWER]);

    // Act
    const nextState = dropProfileDrawerFromStack(state);

    // Assert
    expect(nextState).toBeUndefined();
  });

  it('does nothing when the navigator has no state yet', () => {
    // Act
    const nextState = dropProfileDrawerFromStack(undefined);

    // Assert
    expect(nextState).toBeUndefined();
  });
});
