import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AccountTag from './AccountTag';
import { AccountTagProps } from './AccountTag.types';

describe('AccountTag', () => {
  it('render matches snapshot when name prop is defined', () => {
    const props: AccountTagProps = {
      accountAddress: '0x1',
      accountName: 'Sample Contract',
    };

    const { getByText, toJSON } = renderWithProvider(<AccountTag {...props} />);

    expect(getByText(props.accountName as string)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it("render matches snapshot when name prop isn't defined", () => {
    const props: AccountTagProps = {
      accountAddress: '0x1',
    };

    const { getByText, toJSON } = renderWithProvider(<AccountTag {...props} />);

    expect(getByText(props.accountAddress)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
