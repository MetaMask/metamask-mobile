import React from 'react';
// import { shallow } from 'enzyme';
import { render, screen } from '@testing-library/react-native';
import ContactForm from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('ContactForm', () => {
  it('should render correctly', () => {
    const mockRoute = {
      params: {
        mode: 'ADD', // Provide the expected default value for `mode`
      },
    };
    const mockNavigation = {
      setOptions: jest.fn(),
    };
    const wrapper = render(
      <ThemeContext.Provider value={mockTheme}>
        <Provider store={store}>
          <ContactForm route={mockRoute} navigation={mockNavigation} />
        </Provider>
      </ThemeContext.Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
