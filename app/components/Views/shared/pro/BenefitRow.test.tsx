import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BenefitRow from './BenefitRow';
import { BenefitRowTestIds } from './BenefitRow.testIds';
import { BENEFITS } from './benefits.constants';
import { strings } from '../../../../../locales/i18n';

const item = BENEFITS[0];

const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

describe('BenefitRow', () => {
  it('renders the benefit title and subtitle', () => {
    const { getByTestId } = render(<BenefitRow item={item} />);

    const row = getByTestId(BenefitRowTestIds.ROW(item.id));

    expect(row).toHaveTextContent(toRegex(strings(item.title)));
    expect(row).toHaveTextContent(toRegex(strings(item.subtitle)));
  });

  it('does not set accessibilityRole button when onPress is omitted', () => {
    const { getByTestId } = render(<BenefitRow item={item} />);

    const row = getByTestId(BenefitRowTestIds.ROW(item.id));

    expect(row.props.accessibilityRole).not.toBe('button');
  });

  it('calls onPress with the item when the row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <BenefitRow item={item} onPress={onPress} />,
    );

    fireEvent.press(getByTestId(BenefitRowTestIds.ROW(item.id)));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('does not call onPress before the row is pressed', () => {
    const onPress = jest.fn();

    render(<BenefitRow item={item} onPress={onPress} />);

    expect(onPress).not.toHaveBeenCalled();
  });
});
