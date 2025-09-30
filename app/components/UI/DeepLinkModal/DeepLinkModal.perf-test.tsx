import { measureRenders } from 'reassure';
import { DeepLinkModal } from './';
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from '../../../util/test/configureStore';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    pageTitle: 'MetaMask',
    linkType: 'public',
    onContinue: jest.fn(),
    onBack: jest.fn(),
  }),
  createNavigationDetails: jest.fn(() => ({})),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: (event: string) => ({
      addProperties: () => ({ build: () => ({ event }) }),
    }),
  }),
}));

const store = configureStore({});
const ProvidersWrapper: React.ComponentType<{
  children: React.ReactElement;
}> = ({ children }) => (
  <SafeAreaProvider>
    <Provider store={store}>
      <NavigationContainer>{children}</NavigationContainer>
    </Provider>
  </SafeAreaProvider>
);

test('DeepLinkModal mount performance', async () => {
  await measureRenders(<DeepLinkModal />, { wrapper: ProvidersWrapper });
});
