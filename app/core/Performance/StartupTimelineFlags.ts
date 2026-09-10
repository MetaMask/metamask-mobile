/**
 * Build-time switches for the startup instrumentation.
 *
 * These live in their own module for two reasons.
 *
 * **Release builds.** `babel.config.js` applies
 * `transform-inline-environment-variables` in every babel env, so each
 * `process.env` lookup below is replaced by a literal at transform time. In a
 * normal build both constants become `false`, every guard in
 * {@link ./StartupTimeline} collapses to an immediate return, and a minifier
 * can drop the rest.
 *
 * **Tests.** Because the values are inlined, they cannot be changed at runtime —
 * setting `process.env.MM_STARTUP_TIMELINE` inside a test has no effect, since
 * the transform already ran. Keeping them in a separate module means a test can
 * exercise the enabled paths by mocking this module instead, which is otherwise
 * impossible to reach.
 */

/**
 * Emit cold-start stage marks to the platform log.
 *
 * See `docs/performance/startup-instrumentation.md`.
 */
export const TIMELINE_ENABLED = process.env.MM_STARTUP_TIMELINE === 'true';

/**
 * Record a Hermes sampling profile across cold start.
 *
 * Deliberately separate from {@link TIMELINE_ENABLED} because the sampling
 * profiler has real overhead: stage marks from a profiled run are **inflated**
 * and must not be used as headline timings. Use a profiled build for
 * *attribution* and an unprofiled build for absolute numbers.
 */
export const PROFILE_ENABLED = process.env.MM_STARTUP_PROFILE === 'true';
