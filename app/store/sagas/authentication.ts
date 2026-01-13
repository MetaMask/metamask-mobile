// TODO: Use this file to hold authentication sagas.
// NOTE: This file is not used in the current implementation and will be connected in a follow up PR.

// import { fork, take, cancel, call } from 'redux-saga/effects';
// import NavigationService from '../../core/NavigationService';
// import Routes from '../../constants/navigation/Routes';
// import {
//   AuthSuccessAction,
//   AuthErrorAction,
//   InterruptBiometricsAction,
//   UserActionType,
// } from '../../actions/user';
// import { Task } from 'redux-saga';
// import LockManagerService from '../../core/LockManagerService';
// import { Authentication } from '../../core';

// /**
//  * The state machine, which is responsible for handling the state
//  * changes related to biometrics authentication.
//  */
// export function* biometricsStateMachine(originalBioStateMachineId: string) {
//   // This state machine is only good for a one time use. After it's finished, it relies on LOCKED_APP to restart it.
//   // Handle next three possible states.
//   let shouldHandleAction = false;
//   let action:
//     | AuthSuccessAction
//     | AuthErrorAction
//     | InterruptBiometricsAction
//     | undefined;

//   // Only continue on INTERRUPT_BIOMETRICS action or when actions originated from corresponding state machine.
//   while (!shouldHandleAction) {
//     action = yield take([
//       UserActionType.AUTH_SUCCESS,
//       UserActionType.AUTH_ERROR,
//       UserActionType.INTERRUPT_BIOMETRICS,
//     ]);
//     if (
//       action?.type === UserActionType.INTERRUPT_BIOMETRICS ||
//       action?.payload?.bioStateMachineId === originalBioStateMachineId
//     ) {
//       shouldHandleAction = true;
//     }
//   }

//   if (action?.type === UserActionType.INTERRUPT_BIOMETRICS) {
//     // Biometrics was most likely interrupted during authentication with a non-zero lock timer.
//     yield call(Authentication.lockApp);
//   } else if (action?.type === UserActionType.AUTH_ERROR) {
//     // Authentication service will automatically log out.
//   } else if (action?.type === UserActionType.AUTH_SUCCESS) {
//     // Authentication successful. Navigate to wallet.
//     NavigationService.navigation?.navigate(Routes.ONBOARDING.HOME_NAV);
//   }
// }

// export function* appLockStateMachine() {
//   let biometricsListenerTask: Task<void> | undefined;
//   while (true) {
//     yield take(UserActionType.LOCKED_APP);
//     if (biometricsListenerTask) {
//       yield cancel(biometricsListenerTask);
//     }
//     const bioStateMachineId = Date.now().toString();
//     biometricsListenerTask = yield fork(
//       biometricsStateMachine,
//       bioStateMachineId,
//     );
//     NavigationService.navigation?.navigate(Routes.LOCK_SCREEN, {
//       bioStateMachineId,
//     });
//   }
// }

// /**
//  * The state machine for detecting when the app is logged vs logged out.
//  * While on the Wallet screen, this state machine
//  * will "listen" to the app lock state machine.
//  */
// export function* authStatusStateMachine() {
//   // Start when the user is logged in.
//   while (true) {
//     yield take(UserActionType.LOGIN);
//     // Check if we should show opt in metrics screen
//     // From Login/index.tsx & App/App.tsx

//     const appLockStateMachineTask: Task<void> = yield fork(appLockStateMachine);
//     LockManagerService.startListening();
//     // Listen to app lock behavior.
//     yield take(UserActionType.LOGOUT);
//     LockManagerService.stopListening();
//     // Cancels appLockStateMachineTask, which also cancels nested sagas once logged out.
//     yield cancel(appLockStateMachineTask);
//   }
// }

// export function* startAuthStateMachine() {
//   // Give React a render cycle to render the nested navigation stack screens
//   yield call(() => new Promise((resolve) => requestAnimationFrame(resolve)));
//   // Listen to auth status changes.
//   yield fork(authStatusStateMachine);
//   // Unlock wallet on cold app start.
//   yield call(Authentication.unlockWallet);
// }
