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
  NAVBAR = 'navbar',
}

export enum ActionButtonType {
  BUY = 'buy',
  SWAP = 'swap',
  SEND = 'send',
  RECEIVE = 'receive',
}

/**
 * The position of the button in the action button for remote config use and a/b testing
 * Not in use but will be in the future
 */
export enum ActionPosition {
  FIRST_POSITION = 0,
  SECOND_POSITION = 1,
  THIRD_POSITION = 2,
  FOURTH_POSITION = 3,
}

/**
 * Properties for action button tracking
 *
 * @property action_name - The action that was clicked from the home page or asset details page
 * @property action_position - The position of the button in the action button for remote config use and a/b testing (optional, omitted for navbar)
 * @property button_label - The label of the button - i18n string
 * @property location - The location of the button (home, asset details, navbar)
 */
export interface ActionButtonProperties extends JsonMap {
  action_name: ActionButtonType;
  action_position?: ActionPosition;
  button_label: string;
  location?: ActionLocation;
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
