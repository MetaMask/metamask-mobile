import { JsonMap } from '@segment/analytics-react-native';

function preProcessAnalyticsEvent(params: JsonMap) {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userParams = {} as any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anonymousParams = {} as any;

  if (params) {
    Object.keys(params).forEach((key) => {
      const property = params[key];

      if (
        property &&
        typeof property === 'object' &&
        !Array.isArray(property)
      ) {
        if (property.anonymous) {
          // Anonymous property - add only to anonymous params
          anonymousParams[key] = property.value;
        } else {
          // Non-anonymous property - add to both
          userParams[key] = property.value;
          anonymousParams[key] = property.value;
        }
      } else {
        // Non-anonymous properties - add to both
        userParams[key] = property;
        anonymousParams[key] = property;
      }
    });
  }

  return [userParams, anonymousParams];
}

export default preProcessAnalyticsEvent;
