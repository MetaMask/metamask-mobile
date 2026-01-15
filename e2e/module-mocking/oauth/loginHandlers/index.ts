/**
 * Mock Login Handlers for E2E Testing
 *
 * These handlers replace the real Google/Apple login handlers during E2E builds.
 * They bypass the native OAuth UI while keeping the rest of the flow real.
 */

export { default as GoogleLoginHandler } from './GoogleLoginHandler';
export { default as AppleLoginHandler } from './AppleLoginHandler';
