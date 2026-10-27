import React from 'react';
import { render } from '@testing-library/react-native';
import IconAlert from './IconAlert';
import { IconAlertSeverity } from './IconAlert.types';
import { IconSize } from '@metamask/design-system-react-native';

describe('IconAlert', () => {
  it('renders correctly with Info severity', () => {
    const { toJSON } = render(
      <IconAlert severity={IconAlertSeverity.Info} size={IconSize.Md} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with Success severity', () => {
    const { toJSON } = render(
      <IconAlert severity={IconAlertSeverity.Success} size={IconSize.Md} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with Warning severity', () => {
    const { toJSON } = render(
      <IconAlert severity={IconAlertSeverity.Warning} size={IconSize.Md} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with Danger severity', () => {
    const { toJSON } = render(
      <IconAlert severity={IconAlertSeverity.Danger} size={IconSize.Md} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
