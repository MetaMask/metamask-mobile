// Export MetaMetricsEvents first to avoid circular dependency issues
// MetaMetrics.events.ts only imports from MetaMetrics.types.ts, so it's safe to export early
export { MetaMetricsEvents, EVENT_NAME } from './MetaMetrics.events';

// Export DataDeleteStatus and DataDeleteResponseStatus early to avoid circular dependency issues
// MetaMetrics.types.ts only imports types, so it's safe to export early
export {
  DataDeleteStatus,
  DataDeleteResponseStatus,
} from './MetaMetrics.types';

// Export type separately
export type { IMetaMetricsEvent } from './MetaMetrics.types';

/**
 * ⚠️️ WARNING ⚠️ WARNING ⚠️ WARNING ⚠️ WARNING ⚠️ WARNING ⚠️
 * this is a temporary export to allow the app/components/UI/Ramp/Views/OrdersList/OrdersList.test.tsx
 * to run. This should be removed once the test/file under test is refactored to not rely on the store.
 * This is totally not related to the Metametrics module and was here far before.
 * And this is completely out of scope of the Segment migration but it's a blocker if tests do not pass.
 * Removing the Analytics.js file and it's export here required to add the store export directly here.
 *
 * This issue is likely due to a circular dependency between the store and the module under test.
 * How it is related to metrics is beyond me.
 * Please help me fix this. You are my only hope 🙏
 *
 * TODO: remove this export once the test/file under test is refactored to not rely on the store.
 * see https://github.com/MetaMask/metamask-mobile/issues/8756
 */
import { store } from '../../store';
export { store };

/**
 * ⚠️ WARNING: MetaMetrics Export - Circular Dependency Risk ⚠️
 *
 * This export is placed at the END of the file to minimize circular dependency issues.
 * MetaMetrics imports analytics.ts, which imports Engine.ts, which imports controller init functions
 * that may import back from this index.ts file, creating a circular dependency.
 *
 * **For Engine/controllers layer**: Import MetaMetrics directly from './MetaMetrics' instead of from this index.
 * **For app code**: This export is safe to use, but consider importing directly if you encounter issues.
 *
 * Safe exports (exported above, before MetaMetrics):
 * - MetaMetricsEvents, EVENT_NAME
 * - DataDeleteStatus, DataDeleteResponseStatus
 * - IMetaMetricsEvent (type)
 *
 * @see app/core/Analytics/.nico-ignore/fix-metrics-import.md for migration plan
 */
export { default as MetaMetrics } from './MetaMetrics';
