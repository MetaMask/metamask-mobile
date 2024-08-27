import { JsonMap } from '@segment/analytics-react-native';

function preProcessAnalyticsEvent(properties: JsonMap) {
  const nonAnonymousProperties: JsonMap = {};
  const anonymousProperties: JsonMap = {};

  if (properties) {
    Object.keys(properties).forEach((key) => {
      const property = properties[key];

      if (
        property &&
        typeof property === 'object' &&
        !Array.isArray(property)
      ) {
        if (property.anonymous) {
          // Anonymous property - add only to anonymous properties
          anonymousProperties[key] = property.value;
        } else {
          // Non-anonymous property - add only to non-anonymous properties
          nonAnonymousProperties[key] = property.value;
        }
      } else {
        // Non-anonymous properties - add only to non-anonymous properties
        nonAnonymousProperties[key] = property;
      }
    });
  }

  return [nonAnonymousProperties, anonymousProperties];
}

export default preProcessAnalyticsEvent;
