import { NavigationContainerRef } from '@react-navigation/native';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

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
    `MOCK SDKConnect::asyncInit()[${context}] - starting asyncInit ${navigation} ${instance}`,
  );
  return;
};

export default asyncInit;
