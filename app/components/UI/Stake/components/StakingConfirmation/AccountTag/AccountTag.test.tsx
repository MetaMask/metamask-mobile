import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AccountTag from './AccountTag';
import { AccountTagProps } from './AccountTag.types';

describe('AccountTag', () => {
  it('renders account name when name prop is defined', () => {
    const props: AccountTagProps = {
      accountAddress: '0x1',
      accountName: 'Sample Contract',
    };

    const { getByText } = renderWithProvider(<AccountTag {...props} />);

    expect(getByText(props.accountName as string)).toBeOnTheScreen();
  });

  it('renders account address when name prop is not defined', () => {
    const props: AccountTagProps = {
      accountAddress: '0x1',
    };

    const { getByText } = renderWithProvider(<AccountTag {...props} />);

    expect(getByText(props.accountAddress)).toBeOnTheScreen();
  });
});
