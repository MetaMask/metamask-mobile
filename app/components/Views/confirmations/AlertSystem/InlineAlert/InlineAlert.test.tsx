import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InlineAlert, { InlineAlertProps } from './InlineAlert';
import { Severity } from '../../types/alerts';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      error: { muted: 'red' },
      warning: { muted: 'yellow' },
      info: { muted: 'blue', default: 'lightblue' },
    },
  }),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn().mockReturnValue({ styles: { wrapper: {}, inlineContainer: {}, icon: {} } }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn().mockReturnValue('Inline Alert Label'),
}));

describe('InlineAlert', () => {
  const INLINE_ALERT_LABEL = 'Inline Alert Label';

  const renderComponent = (props: Partial<InlineAlertProps> = {}) => render(<InlineAlert {...props} />);

  it('renders correctly with default props', () => {
    const { getByTestId, getByText } = renderComponent();
    const inlineAlert = getByTestId('inline-alert');
    const label = getByText(INLINE_ALERT_LABEL);

    expect(inlineAlert).toBeDefined();
    expect(label).toBeDefined();
  });

  it('renders with danger severity', () => {
    const { getByTestId } = renderComponent({ severity: Severity.Danger });
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders with warning severity', () => {
    const { getByTestId } = renderComponent({ severity: Severity.Warning });
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders with info severity', () => {
    const { getByTestId } = renderComponent({ severity: Severity.Info });
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Info);
  });

  it('renders with default severity', () => {
    const { getByTestId } = renderComponent({ severity: undefined });
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Info);
  });

  it('calls onClick handler when pressed', () => {
    const onClick = jest.fn();
    const { getByTestId } = renderComponent({ onClick });
    const inlineAlert = getByTestId('inline-alert');

    fireEvent.press(inlineAlert);
    expect(onClick).toHaveBeenCalled();
  });
});
