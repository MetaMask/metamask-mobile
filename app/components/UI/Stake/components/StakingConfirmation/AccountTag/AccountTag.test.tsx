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

    const component = renderWithProvider(<AccountTag {...props} />);
    const { getByText } = component;

    expect(getByText(props.accountName as string)).toBeDefined();

    expect(component).toMatchSnapshot();
  });

  it("render matches snapshot when name prop isn't defined", () => {
    const props: AccountTagProps = {
      accountAddress: '0x1',
    };

    const component = renderWithProvider(<AccountTag {...props} />);
    const { getByText } = component;

    expect(getByText(props.accountAddress)).toBeDefined();

    expect(component).toMatchSnapshot();
  });
});
