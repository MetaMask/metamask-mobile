import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as traceObj from '../../../util/trace';
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        locked: false,
      },
    }),
  };
});

describe('Login', () => {
  it('should render correctly', () => {
    const spyFetch = jest
      .spyOn(traceObj, 'trace')
      .mockImplementation(() => undefined);
    const { toJSON } = renderWithProvider(<Login />);
    expect(toJSON()).toMatchSnapshot();
    expect(spyFetch).toHaveBeenCalledTimes(2);
  });
});
