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
 * There are two types of legacy properties:
 * - properties with the new structure (properties and sensitiveProperties) but with anonymous properties inside properties
 * - properties with the old structure (just a JsonMap) and possibly anonymous properties inside
 *
 * If the properties are already of the new type, they are returned as is
 * @param propertiesParam the properties to check for conversion and convert if needed
 */
function convertLegacyProperties(
  propertiesParam: CombinedProperties,
): EventProperties {
  if (isEventProperties(propertiesParam)) {
    // EventProperties non-anonymous properties could have anonymous properties inside
    // so we need to process them separately
    if (
      propertiesParam.properties &&
      Object.keys(propertiesParam.properties).length
    ) {
      const [nonAnonymousProperties, anonymousProperties] =
        preProcessAnalyticsEvent(propertiesParam.properties);
      return {
        properties: nonAnonymousProperties,
        // and concatenate all the anon props in sensitiveProperties
        sensitiveProperties: {
          ...anonymousProperties,
          ...propertiesParam.sensitiveProperties,
        },
      };
    }
    // If there are no non-anonymous properties, we don't need to process them
    // and we can return the object as is
    return propertiesParam;
  }

  // if the properties are not of the new type, we need to process them
  const [nonAnonymousProperties, anonymousProperties] =
    preProcessAnalyticsEvent(propertiesParam);
  return {
    properties: nonAnonymousProperties,
    sensitiveProperties: anonymousProperties,
  };
}

export default convertLegacyProperties;
