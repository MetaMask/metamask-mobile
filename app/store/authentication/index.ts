/**
 * Authentication Store Module
 *
 * Re-exports from the authentication slice for backward compatibility.
 * Actual implementation is in app/core/redux/slices/authentication
 */

export * from '../../core/redux/slices/authentication';
export { default as authenticationReducer } from '../../core/redux/slices/authentication';
export { authenticationSaga } from '../../core/redux/slices/authentication/sagas';
