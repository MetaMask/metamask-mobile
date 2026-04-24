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

    const { getByText } = renderWithProvider(<AccountTag {...props} />);

    expect(getByText(props.accountName as string)).toBeOnTheScreen();
  });

  it("render matches snapshot when name prop isn't defined", () => {
    const props: AccountTagProps = {
      accountAddress: '0x1',
    };

    const { getByText } = renderWithProvider(<AccountTag {...props} />);

    expect(getByText(props.accountAddress)).toBeOnTheScreen();
  });
});
