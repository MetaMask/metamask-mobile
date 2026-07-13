import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  NavigationContainer,
  StackActions,
  createNavigationContainerRef,
  useNavigation,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../constants/navigation/Routes';
import { navigateToActivityAfterConfirmation } from './navigateToActivityAfterConfirmation';

// This is an integration test against REAL React Navigation state (not mocked),
// because the fix depends on how the confirmation pop and the Activity push
// interact across nested navigators (and the ordering differs by stack shape).
// It reconstructs the exact stack shape each flow has at transaction-submission
// time (see the flow traces in the PR description) and asserts that after the
// redirect:
//   1. the user lands on the Activity screen, and
//   2. pressing "back" returns to the transaction-building screen, not the
//      consumed confirmation.

const RootStack = createNativeStackNavigator();
const NestedStack = createNativeStackNavigator();

const REDESIGNED = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;

const Probe = ({ label }: { label: string }) => <Text>{label}</Text>;

// A confirmation screen whose only job is to trigger the redirect helper with
// its own (nested) navigation object — mirroring how the real confirmation
// footers/hooks call it.
const ConfirmationScreen = () => {
  const navigation = useNavigation();
  return (
    <Text
      testID="redirect-trigger"
      onPress={() => navigateToActivityAfterConfirmation(navigation)}
    >
      confirm
    </Text>
  );
};

const StakeScreensNavigator = () => (
  <NestedStack.Navigator screenOptions={{ headerShown: false }}>
    <NestedStack.Screen name={Routes.STAKING.STAKE}>
      {() => <Probe label="stake-input" />}
    </NestedStack.Screen>
    <NestedStack.Screen name={REDESIGNED} component={ConfirmationScreen} />
  </NestedStack.Navigator>
);

const EarnScreensNavigator = () => (
  <NestedStack.Navigator screenOptions={{ headerShown: false }}>
    <NestedStack.Screen
      name={Routes.EARN.LENDING_DEPOSIT_CONFIRMATION}
      component={ConfirmationScreen}
    />
  </NestedStack.Navigator>
);

const SendNavigator = () => (
  <NestedStack.Navigator screenOptions={{ headerShown: false }}>
    <NestedStack.Screen name={Routes.SEND.AMOUNT}>
      {() => <Probe label="send-amount" />}
    </NestedStack.Screen>
    <NestedStack.Screen name={Routes.SEND.RECIPIENT}>
      {() => <Probe label="send-recipient" />}
    </NestedStack.Screen>
    <NestedStack.Screen name={REDESIGNED} component={ConfirmationScreen} />
  </NestedStack.Navigator>
);

const renderTree = (
  initialState: PartialState<NavigationState>,
  ref: ReturnType<typeof createNavigationContainerRef>,
) =>
  render(
    <NavigationContainer ref={ref} initialState={initialState}>
      {/* TRANSACTIONS_VIEW is registered at the root level, as it is when the
          Money-account feature is enabled — this is what lets a bare
          navigate(TRANSACTIONS_VIEW) push Activity on top of a confirmation. */}
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name={Routes.HOME_TABS}>
          {() => <Probe label="home" />}
        </RootStack.Screen>
        <RootStack.Screen
          name="StakeScreens"
          component={StakeScreensNavigator}
        />
        <RootStack.Screen
          name={Routes.EARN.ROOT}
          component={EarnScreensNavigator}
        />
        <RootStack.Screen
          name={Routes.SEND.DEFAULT}
          component={SendNavigator}
        />
        <RootStack.Screen name={Routes.TRANSACTIONS_VIEW}>
          {() => <Probe label="activity" />}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>,
  );

// Name of the currently focused leaf route in the whole tree.
const focusedRouteName = (
  ref: ReturnType<typeof createNavigationContainerRef>,
): string | undefined => ref.getCurrentRoute()?.name;

// Names of the top-level (root) routes, in order.
const rootRouteNames = (
  ref: ReturnType<typeof createNavigationContainerRef>,
): string[] => (ref.getRootState()?.routes ?? []).map((route) => route.name);

describe('navigateToActivityAfterConfirmation', () => {
  it('flow 1 (staking): replaces the flow stack with Activity; back returns to Wallet home', () => {
    const ref = createNavigationContainerRef();
    const { getByTestId } = renderTree(
      {
        routes: [
          { name: Routes.HOME_TABS },
          {
            name: 'StakeScreens',
            state: {
              index: 1,
              routes: [{ name: Routes.STAKING.STAKE }, { name: REDESIGNED }],
            },
          },
        ],
        index: 1,
      } as PartialState<NavigationState>,
      ref,
    );

    fireEvent.press(getByTestId('redirect-trigger'));

    // The whole StakeScreens flow stack is replaced by Activity (the build
    // screen is nested inside it, so it goes with it).
    expect(focusedRouteName(ref)).toBe(Routes.TRANSACTIONS_VIEW);
    expect(rootRouteNames(ref)).toEqual([
      Routes.HOME_TABS,
      Routes.TRANSACTIONS_VIEW,
    ]);

    // Back returns to Wallet home, not the consumed confirmation.
    act(() => {
      ref.goBack();
    });
    expect(focusedRouteName(ref)).toBe(Routes.HOME_TABS);
  });

  it('flow 2 (lending): replaces only the confirmation stack; back returns to the input screen in the surviving sibling stack', () => {
    const ref = createNavigationContainerRef();
    const { getByTestId } = renderTree(
      {
        routes: [
          { name: Routes.HOME_TABS },
          {
            name: 'StakeScreens',
            state: { index: 0, routes: [{ name: Routes.STAKING.STAKE }] },
          },
          {
            name: Routes.EARN.ROOT,
            state: {
              index: 0,
              routes: [{ name: Routes.EARN.LENDING_DEPOSIT_CONFIRMATION }],
            },
          },
        ],
        index: 2,
      } as PartialState<NavigationState>,
      ref,
    );

    fireEvent.press(getByTestId('redirect-trigger'));

    // Only the EarnScreens stack (which held just the confirmation) is replaced;
    // the sibling StakeScreens stack with the input screen survives beneath.
    expect(focusedRouteName(ref)).toBe(Routes.TRANSACTIONS_VIEW);
    expect(rootRouteNames(ref)).toEqual([
      Routes.HOME_TABS,
      'StakeScreens',
      Routes.TRANSACTIONS_VIEW,
    ]);

    act(() => {
      ref.goBack();
    });
    expect(focusedRouteName(ref)).toBe(Routes.STAKING.STAKE);
  });

  it('flow 3 (send): replaces the flow stack with Activity; back returns to Wallet home', () => {
    const ref = createNavigationContainerRef();
    const { getByTestId } = renderTree(
      {
        routes: [
          { name: Routes.HOME_TABS },
          {
            name: Routes.SEND.DEFAULT,
            state: {
              index: 2,
              routes: [
                { name: Routes.SEND.AMOUNT },
                { name: Routes.SEND.RECIPIENT },
                { name: REDESIGNED },
              ],
            },
          },
        ],
        index: 1,
      } as PartialState<NavigationState>,
      ref,
    );

    fireEvent.press(getByTestId('redirect-trigger'));

    // The whole Send flow stack (Amount/Recipient/confirmation) is replaced.
    expect(focusedRouteName(ref)).toBe(Routes.TRANSACTIONS_VIEW);
    expect(rootRouteNames(ref)).toEqual([
      Routes.HOME_TABS,
      Routes.TRANSACTIONS_VIEW,
    ]);

    act(() => {
      ref.goBack();
    });
    expect(focusedRouteName(ref)).toBe(Routes.HOME_TABS);
  });
});

describe('navigateToActivityAfterConfirmation — routing by Activity route location', () => {
  const makeNavigation = (routeNames?: string[]) => {
    const dispatch = jest.fn();
    const navigate = jest.fn();
    const getParent =
      routeNames === undefined
        ? () => undefined
        : () => ({ getState: () => ({ routeNames }), dispatch });
    return {
      navigation: { navigate, getParent } as never,
      dispatch,
      navigate,
    };
  };

  it('replaces the flow stack when Activity is a root route (Money-account on)', () => {
    const { navigation, dispatch, navigate } = makeNavigation([
      Routes.HOME_TABS,
      Routes.SEND.DEFAULT,
      Routes.TRANSACTIONS_VIEW,
    ]);

    navigateToActivityAfterConfirmation(navigation);

    expect(dispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.TRANSACTIONS_VIEW),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to navigate when Activity is not a root route (Money-account off)', () => {
    const { navigation, dispatch, navigate } = makeNavigation([
      Routes.HOME_TABS,
      Routes.SEND.DEFAULT,
    ]);

    navigateToActivityAfterConfirmation(navigation);

    expect(navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('falls back to navigate when there is no parent navigator', () => {
    const { navigation, navigate } = makeNavigation(undefined);

    navigateToActivityAfterConfirmation(navigation);

    expect(navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });
});
