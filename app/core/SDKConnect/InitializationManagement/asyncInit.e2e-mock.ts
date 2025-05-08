import { NavigationContainerRef } from '@react-navigation/native';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

/**
 * Mock implementation of the postInit function for SDKConnect.
 * This mock will simply return as no SDK context is needed on Detox tests.
*/
const asyncInit = async ({
  navigation,
  instance,
  context,
}: {
  navigation: NavigationContainerRef;
  instance: SDKConnect;
  context?: string;
}) => {
  DevLogger.log(
    `[MOCK] SDKConnect::asyncInit()[${context}] - starting asyncInit ${navigation} ${instance}`,
  );
  return;
};

export default asyncInit;
