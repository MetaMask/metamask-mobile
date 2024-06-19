import React from 'react';
import { SafeAreaView } from 'react-native';
import { shallow } from 'enzyme';
import ModalMandatory from './ModalMandatory';
import { render } from '@testing-library/react-native';
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
  it('should render correctly', () => {
    const wrapper = shallow(
      <SafeAreaView>
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
      </SafeAreaView>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly with isTermsModal=true', () => {
    const { getByTestId, queryByTestId } = render(
      <ModalMandatory
        route={{
          params: {
            isTermsModal: true,
            headerTitle: 'test',
            footerHelpText: 'test',
            buttonText: 'test',
            body: { source: 'WebView', uri: 'http://google.com' },
            onAccept: () => null,
            checkboxText: 'test',
          },
        }}
      />,
    );

    const modalElement = getByTestId('terms-of-use-modal');
    const containerId = queryByTestId('containerTestId');
    expect(modalElement).toBeTruthy();
    expect(containerId).toBeFalsy();
  });

  it('renders correctly with isTermsModal=false', () => {
    const { getByTestId, queryByTestId } = render(
      <ModalMandatory
        route={{
          params: {
            isTermsModal: false,
            headerTitle: 'test',
            footerHelpText: 'test',
            buttonText: 'test',
            body: { source: 'WebView', uri: 'http://google.com' },
            onAccept: () => null,
            checkboxText: 'test',
          },
        }}
      />,
    );

    const containerId = getByTestId('terms-of-use-webview-id');
    const modalElement = queryByTestId('terms-of-use-modal');
    expect(containerId).toBeTruthy();
    expect(modalElement).toBeFalsy();
  });
});
