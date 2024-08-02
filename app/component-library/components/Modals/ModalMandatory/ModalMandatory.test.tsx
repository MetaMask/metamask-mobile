import React from 'react';
import { SafeAreaView } from 'react-native';
import ModalMandatory from './ModalMandatory';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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
    const { toJSON } = renderWithProvider(
      /*  <SafeAreaView> */
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
      />,
      /*   </SafeAreaView>, */
    );
    expect(toJSON).toMatchSnapshot();
  });
  it('should render correctly component mandatory modal', () => {
    const { toJSON } = renderWithProvider(
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
      />,
    );
    expect(toJSON).toMatchSnapshot();
  });
});
