import {
  CombinedProperties,
  EventProperties,
} from '../../core/Analytics/MetaMetrics.types';
import preProcessAnalyticsEvent from './preProcessAnalyticsEvent';

function isEventProperties(
  properties: CombinedProperties,
): properties is EventProperties {
  return (
    properties &&
    typeof properties === 'object' &&
    ('properties' in properties || 'sensitiveProperties' in properties)
  );
}

/**
 * Convert legacy properties to the new EventProperties type if needed
 *
 * If the properties are already of the new type, they are returned as is
 * @param properties
 */
function convertLegacyProperties(
  properties: CombinedProperties,
): EventProperties {
  if (isEventProperties(properties)) {
    // EventProperties non-anonymous properties could have anonymous properties inside
    // so we need to process them separately
    if (properties.properties && Object.keys(properties.properties).length) {
      const [nonAnonymousProperties, anonymousProperties] =
        preProcessAnalyticsEvent(properties.properties);
      return {
        properties: nonAnonymousProperties,
        // and concatenate all the anon props in sensitiveProperties
        sensitiveProperties: {
          ...anonymousProperties,
          ...properties.sensitiveProperties,
        },
      };
    }
    // If there are no non-anonymous properties, we don't need to process them
    // and we can return the object as is
    return properties;
  }

  // if the properties are not of the new type, we need to process them
  const [nonAnonymousProperties, anonymousProperties] =
    preProcessAnalyticsEvent(properties);
  return {
    properties: nonAnonymousProperties,
    sensitiveProperties: anonymousProperties,
  };
}

export default convertLegacyProperties;
