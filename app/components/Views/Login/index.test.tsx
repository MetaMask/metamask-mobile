import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as traceObj from '../../../util/trace';

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
