import React from 'react';
import ModalMandatory from './ModalMandatory';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { Platform } from 'react-native';

const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockedNavigate,
    }),
  };
});
describe('Mandatory Modal', () => {
  it('should render correctly webview mandatory modal', () => {
    // Override Platform.OS to simulate iOS
    Platform.OS = 'ios';

    const { toJSON } = renderWithProvider(
      <ThemeContext.Provider value={mockTheme}>
        <SafeAreaProvider>
          <ModalMandatory
            route={{
              params: {
                headerTitle: 'test',
                footerHelpText: 'test',
                buttonText: 'test',
                body: { source: 'WebView', uri: 'http://google.com' },
                onAccept: () => null,
                checkboxText: 'test',
              },
            }}
          />
        </SafeAreaProvider>
      </ThemeContext.Provider>,
    );
    expect(toJSON).toMatchSnapshot();
  });

  it('should render correctly component mandatory modal', () => {
    const { toJSON } = renderWithProvider(
      <SafeAreaProvider>
        <ModalMandatory
          route={{
            params: {
              headerTitle: 'test',
              footerHelpText: 'test',
              buttonText: 'test',
              body: { source: 'Node', component: () => <></> },
              onAccept: () => null,
              checkboxText: 'test',
            },
          }}
        />
      </SafeAreaProvider>,
    );
    expect(toJSON).toMatchSnapshot();
  });
});
