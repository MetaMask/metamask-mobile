import MetaMetrics from './MetaMetrics';
import { MetaMetricsEvents, EVENT_NAME } from './MetaMetrics.events';
import {
  DataDeleteStatus,
  DataDeleteResponseStatus,
  IMetaMetricsEvent,
} from './MetaMetrics.types';

export {
  MetaMetrics,
  MetaMetricsEvents,
  DataDeleteStatus,
  DataDeleteResponseStatus,
  EVENT_NAME,
};

export type { IMetaMetricsEvent };

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
