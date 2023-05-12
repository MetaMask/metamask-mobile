import React from 'react';
import { SafeAreaView } from 'react-native';
import { shallow } from 'enzyme';
import ModalMandatory from './ModalMandatory';
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
});
