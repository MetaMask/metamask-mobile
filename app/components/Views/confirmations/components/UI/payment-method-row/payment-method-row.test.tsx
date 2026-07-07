import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import PaymentMethodRow from './payment-method-row';
import { LastUsedTag } from '../last-used-tag';
import { NoFeeTag } from '../no-fee-tag';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseElevatedSurface = jest.fn(() => 'bg-default');

jest.mock('../../../../../../util/theme/themeUtils', () => ({
  useElevatedSurface: () => mockUseElevatedSurface(),
}));

const baseProps = {
  id: 'usdc',
  icon: <Text testID="icon">USDC-icon</Text>,
  title: 'USDC',
};

describe('PaymentMethodRow', () => {
  beforeEach(() => {
    mockUseElevatedSurface.mockReturnValue('bg-default');
  });

  it('uses elevated surface class for unselected rows', () => {
    render(<PaymentMethodRow {...baseProps} />);

    expect(mockUseElevatedSurface).toHaveBeenCalled();
  });

  it('renders title and icon with derived testID', () => {
    const { getByTestId } = render(<PaymentMethodRow {...baseProps} />);

    expect(getByTestId('payment-method-row-usdc')).toBeOnTheScreen();
    expect(getByTestId('payment-method-row-usdc-title')).toHaveTextContent(
      'USDC',
    );
    expect(getByTestId('icon')).toBeOnTheScreen();
  });

  it('renders subtitle when provided', () => {
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} subtitle="$500.00 available" />,
    );

    expect(getByTestId('payment-method-row-usdc-subtitle')).toHaveTextContent(
      '$500.00 available',
    );
  });

  it('renders no tag when tagRenderers is undefined', () => {
    const { queryByTestId } = render(<PaymentMethodRow {...baseProps} />);

    expect(queryByTestId('last-used-tag')).not.toBeOnTheScreen();
    expect(queryByTestId('no-fee-tag')).not.toBeOnTheScreen();
  });

  it('renders no tag when all renderers return null', () => {
    const { queryByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        tagRenderers={[() => null, () => null]}
      />,
    );

    expect(queryByTestId('last-used-tag')).not.toBeOnTheScreen();
    expect(queryByTestId('no-fee-tag')).not.toBeOnTheScreen();
  });

  it('renders the first non-null tag from tagRenderers', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        tagRenderers={[() => <NoFeeTag />, () => <LastUsedTag />]}
      />,
    );

    expect(getByTestId('no-fee-tag')).toBeOnTheScreen();
    expect(queryByTestId('last-used-tag')).not.toBeOnTheScreen();
  });

  it('falls back to the next renderer when an earlier one returns null', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        tagRenderers={[() => null, () => <LastUsedTag />]}
      />,
    );

    expect(getByTestId('last-used-tag')).toBeOnTheScreen();
    expect(queryByTestId('no-fee-tag')).not.toBeOnTheScreen();
  });

  it('preserves precedence: "No fee" wins over "Last used" via array order', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        tagRenderers={[() => <NoFeeTag />, () => <LastUsedTag />]}
      />,
    );

    expect(getByTestId('no-fee-tag')).toBeOnTheScreen();
    expect(queryByTestId('last-used-tag')).not.toBeOnTheScreen();
  });

  it('renders the localised label of the winning tag', () => {
    const { getByText } = render(
      <PaymentMethodRow {...baseProps} tagRenderers={[() => <NoFeeTag />]} />,
    );

    expect(getByText('money.potential_earnings.no_fee')).toBeOnTheScreen();
  });

  it('supports tag testID overrides for disambiguation across rows', () => {
    const { getByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        tagRenderers={[
          () => <NoFeeTag testID="payment-method-row-usdc-no-fee-tag" />,
        ]}
      />,
    );

    expect(getByTestId('payment-method-row-usdc-no-fee-tag')).toBeOnTheScreen();
  });

  it('renders checkmark when trailingElement is "checkmark"', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow {...baseProps} trailingElement="checkmark" />,
    );

    expect(getByTestId('payment-method-row-checkmark')).toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-chevron')).not.toBeOnTheScreen();
  });

  it('renders chevron when trailingElement is "chevron"', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow {...baseProps} trailingElement="chevron" />,
    );

    expect(getByTestId('payment-method-row-chevron')).toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-checkmark')).not.toBeOnTheScreen();
  });

  it('renders nothing trailing when trailingElement is "none"', () => {
    const { queryByTestId } = render(
      <PaymentMethodRow {...baseProps} trailingElement="none" />,
    );

    expect(queryByTestId('payment-method-row-checkmark')).not.toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-chevron')).not.toBeOnTheScreen();
  });

  it('renders custom ReactNode trailing element when provided', () => {
    const { getByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        trailingElement={<Text testID="custom-trailing">Add</Text>}
      />,
    );

    expect(getByTestId('custom-trailing')).toHaveTextContent('Add');
  });

  it('invokes onPress when row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} onPress={onPress} />,
    );

    fireEvent.press(getByTestId('payment-method-row-usdc'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} onPress={onPress} disabled />,
    );

    fireEvent.press(getByTestId('payment-method-row-usdc'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} testID="custom-test-id" />,
    );

    expect(getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('renders icon slot wrapper with derived testID', () => {
    const { getByTestId } = render(<PaymentMethodRow {...baseProps} />);

    expect(getByTestId('payment-method-row-usdc-icon-slot')).toBeOnTheScreen();
  });

  it('renders the icon slot with a different style when isSelected is true', () => {
    const { getByTestId: getByTestIdUnselected } = render(
      <PaymentMethodRow {...baseProps} />,
    );
    const { getByTestId: getByTestIdSelected } = render(
      <PaymentMethodRow {...baseProps} isSelected />,
    );

    const unselectedStyle = getByTestIdUnselected(
      'payment-method-row-usdc-icon-slot',
    ).props.style;
    const selectedStyle = getByTestIdSelected(
      'payment-method-row-usdc-icon-slot',
    ).props.style;

    expect(JSON.stringify(selectedStyle)).not.toEqual(
      JSON.stringify(unselectedStyle),
    );
  });
});
