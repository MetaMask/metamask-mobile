import { MetaMetricsEvents } from '../../core/Analytics';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';

export enum ActionLocation {
  HOME = 'home',
  ASSET_DETAILS = 'asset details',
}

export enum ActionButtonType {
  BUY = 'buy',
  SWAP = 'swap',
  SEND = 'send',
  RECEIVE = 'receive',
}

export enum ActionPosition {
  BUY = 'buy',
  SWAP = 'swap',
  SEND = 'send',
  RECEIVE = 'receive',
}

/**
 * Properties for action button tracking
 *
 * @property action_name - The action that was clicked
 * @property action_id - Future remote config
 * @property action_position - The position of the button in the action button
 * @property button_label - The label of the button i18n string
 * @property location - The location of the button (home, asset details)
 */
export interface ActionButtonProperties extends JsonMap {
  action_name: ActionButtonType;
  action_id?: string;
  action_position: ActionPosition;
  button_label: string;
  location: ActionLocation;
}

/**
 * Track action button click with new consolidated event
 *
 * @param trackEvent - MetaMetrics trackEvent function
 * @param createEventBuilder - MetaMetrics createEventBuilder function
 * @param properties - Button properties
 */
export const trackActionButtonClick = (
  trackEvent: (event: ITrackingEvent) => void,
  createEventBuilder: (event: IMetaMetricsEvent) => MetricsEventBuilder,
  properties: ActionButtonProperties,
) => {
  trackEvent(
    createEventBuilder(MetaMetricsEvents.ACTION_BUTTON_CLICKED)
      .addProperties(properties)
      .build(),
  );
};
