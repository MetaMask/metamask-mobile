import React from 'react';
import { render } from '@testing-library/react-native';
import CardAlertSection from './CardAlertSection';
import { CardMessageBoxType } from '../../../types';
import type { CardAlert } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../components/CardMessageBox/CardMessageBox', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    messageType,
    onConfirm,
    onDismiss,
  }: {
    messageType: string;
    onConfirm?: () => void;
    onDismiss?: () => void;
  }) => (
    <View
      testID={`card-message-box-${messageType}`}
      accessibilityLabel={JSON.stringify({
        messageType,
        hasOnConfirm: !!onConfirm,
        hasOnDismiss: !!onDismiss,
      })}
    />
  );
});

const mockOnNavigateToSpendingLimit = jest.fn();
const mockOnDismissSpendingLimitWarning = jest.fn();

function renderComponent(alerts: CardAlert[]) {
  return render(
    <CardAlertSection
      alerts={alerts}
      onNavigateToSpendingLimit={mockOnNavigateToSpendingLimit}
      onDismissSpendingLimitWarning={mockOnDismissSpendingLimitWarning}
    />,
  );
}

describe('CardAlertSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders CloseSpendingLimit CardMessageBox with onConfirm and onDismiss', () => {
    const { getByTestId } = renderComponent([
      {
        type: 'close_to_spending_limit',
        dismissable: true,
        action: { type: 'navigate', route: 'SpendingLimit' },
      },
    ]);

    const box = getByTestId(
      `card-message-box-${CardMessageBoxType.CloseSpendingLimit}`,
    );
    expect(box).toBeOnTheScreen();

    const props = JSON.parse(box.props.accessibilityLabel);
    expect(props.hasOnConfirm).toBe(true);
    expect(props.hasOnDismiss).toBe(true);
  });

  it('renders KYCPending CardMessageBox for kyc_pending alert', () => {
    const { getByTestId } = renderComponent([
      { type: 'kyc_pending', dismissable: false },
    ]);

    const box = getByTestId(
      `card-message-box-${CardMessageBoxType.KYCPending}`,
    );
    expect(box).toBeOnTheScreen();

    const props = JSON.parse(box.props.accessibilityLabel);
    expect(props.hasOnConfirm).toBe(false);
    expect(props.hasOnDismiss).toBe(false);
  });

  it('renders CardProvisioning CardMessageBox for card_provisioning alert', () => {
    const { getByTestId } = renderComponent([
      { type: 'card_provisioning', dismissable: false },
    ]);

    const box = getByTestId(
      `card-message-box-${CardMessageBoxType.CardProvisioning}`,
    );
    expect(box).toBeOnTheScreen();

    const props = JSON.parse(box.props.accessibilityLabel);
    expect(props.hasOnConfirm).toBe(false);
    expect(props.hasOnDismiss).toBe(false);
  });

  it('renders nothing for unknown alert type', () => {
    const { toJSON } = renderComponent([
      { type: 'some_unknown_type' as CardAlert['type'], dismissable: false },
    ]);

    expect(toJSON()).toBeNull();
  });

  it('renders multiple alerts', () => {
    const { getByTestId } = renderComponent([
      { type: 'kyc_pending', dismissable: false },
      { type: 'card_provisioning', dismissable: false },
    ]);

    expect(
      getByTestId(`card-message-box-${CardMessageBoxType.KYCPending}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`card-message-box-${CardMessageBoxType.CardProvisioning}`),
    ).toBeOnTheScreen();
  });
});
