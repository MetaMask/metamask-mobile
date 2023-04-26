import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { shallow } from 'enzyme';

import { ThemeContext, mockTheme } from '../../../../util/theme';
import EditPermission from './';

const props = {
  host: 'www.google.com',
  token: { tokenSymbol: 'TDC', tokenDecimals: 6 },
  originalApproveAmount: '10',
  spendLimitCustomValue: '.0001',
  onSpendLimitCustomValueChange: () => undefined,
  spendLimitUnlimitedSelected: false,
  onSpendLimitUnlimitedSelectedChange: () => undefined,
  transaction: { data: '0x0' },
  setTransactionObject: () => undefined,
  toggleEditPermission: () => undefined,
  onCustomSpendAmountChange: () => undefined,
  spenderAddress: '0x0',
  getAnalyticsParams: () => ({}),
};

describe('EditPermission', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<EditPermission {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should match snapshot', () => {
    const container = render(
      <ThemeContext.Provider value={mockTheme}>
        <EditPermission {...props} />
      </ThemeContext.Provider>,
    );
    expect(container).toMatchSnapshot();
  });

  it('should call onCustomSpendAmountChange when "Set" button in footer is clicked', () => {
    const onCustomSpendAmountChange = jest.fn();
    const { getByRole } = render(
      <ThemeContext.Provider value={mockTheme}>
        <EditPermission
          {...props}
          onCustomSpendAmountChange={onCustomSpendAmountChange}
        />
      </ThemeContext.Provider>,
    );
    fireEvent.press(getByRole('button', { name: 'Set' }));
    expect(onCustomSpendAmountChange).toBeCalledTimes(1);
  });
});
