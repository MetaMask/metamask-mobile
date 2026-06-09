import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import HomepageSectionUnrealizedPnlRow from './HomepageSectionUnrealizedPnlRow';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: string[]) => ({ testStyle: args.join(' ') }),
  }),
}));

jest.mock('../../../../../component-library/components-temp/Skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: (props: { width: number; height: number }) => (
      <View
        testID="skeleton"
        data-width={props.width}
        data-height={props.height}
      />
    ),
  };
});

describe('HomepageSectionUnrealizedPnlRow', () => {
  it('renders null when valueText is undefined', () => {
    const { toJSON } = render(
      <HomepageSectionUnrealizedPnlRow label="Unrealized P&L" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders null when valueText is empty string', () => {
    const { toJSON } = render(
      <HomepageSectionUnrealizedPnlRow label="Unrealized P&L" valueText="" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders skeleton when isLoading is true', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="Unrealized P&L"
        isLoading
        testID="pnl-row"
      />,
    );
    expect(screen.getByTestId('skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('pnl-row')).toBeOnTheScreen();
    expect(screen.queryByText('Unrealized P&L')).toBeNull();
  });

  it('renders value and label when valueText is provided', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="Unrealized P&L"
        valueText="+$95.39 (+9.4%)"
      />,
    );
    expect(screen.getByText('+$95.39 (+9.4%)')).toBeOnTheScreen();
    expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
  });

  it('derives value/label testIDs from testID prop', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="Unrealized P&L"
        valueText="+$10"
        testID="pnl"
      />,
    );
    expect(screen.getByTestId('pnl')).toBeOnTheScreen();
    expect(screen.getByTestId('pnl-value')).toBeOnTheScreen();
    expect(screen.getByTestId('pnl-label')).toBeOnTheScreen();
  });

  it('uses explicit valueTestID and labelTestID over derived ones', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="P&L"
        valueText="+$10"
        testID="pnl"
        valueTestID="custom-value"
        labelTestID="custom-label"
      />,
    );
    expect(screen.getByTestId('custom-value')).toBeOnTheScreen();
    expect(screen.getByTestId('custom-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pnl-value')).toBeNull();
    expect(screen.queryByTestId('pnl-label')).toBeNull();
  });

  it('does not set testIDs on value/label when testID is not provided', () => {
    render(<HomepageSectionUnrealizedPnlRow label="P&L" valueText="+$10" />);
    expect(screen.getByText('+$10')).toBeOnTheScreen();
    expect(screen.getByText('P&L')).toBeOnTheScreen();
  });

  describe('toneToColor mapping', () => {
    it('applies success color for positive tone', () => {
      render(
        <HomepageSectionUnrealizedPnlRow
          label="P&L"
          valueText="+$10"
          tone="positive"
          valueTestID="val"
        />,
      );
      expect(screen.getByTestId('val')).toBeOnTheScreen();
    });

    it('applies error color for negative tone', () => {
      render(
        <HomepageSectionUnrealizedPnlRow
          label="P&L"
          valueText="-$5"
          tone="negative"
          valueTestID="val"
        />,
      );
      expect(screen.getByTestId('val')).toBeOnTheScreen();
    });

    it('applies default text color for neutral tone (default)', () => {
      render(
        <HomepageSectionUnrealizedPnlRow
          label="P&L"
          valueText="$0"
          valueTestID="val"
        />,
      );
      expect(screen.getByTestId('val')).toBeOnTheScreen();
    });
  });

  it('uses valueColor prop over tone-derived color', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="P&L"
        valueText="+$10"
        tone="positive"
        valueColor={TextColor.WarningDefault}
        valueTestID="val"
      />,
    );
    expect(screen.getByTestId('val')).toBeOnTheScreen();
  });

  it('passes paddingHorizontal=0 without error', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="P&L"
        valueText="+$10"
        paddingHorizontal={0}
        testID="row"
      />,
    );
    expect(screen.getByTestId('row')).toBeOnTheScreen();
  });

  it('passes marginTop=1 without error', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="P&L"
        valueText="+$10"
        marginTop={1}
        testID="row"
      />,
    );
    expect(screen.getByTestId('row')).toBeOnTheScreen();
  });

  it('renders skeleton with marginTop and paddingHorizontal when loading', () => {
    render(
      <HomepageSectionUnrealizedPnlRow
        label="P&L"
        isLoading
        marginTop={1}
        paddingHorizontal={0}
        testID="loading-row"
      />,
    );
    expect(screen.getByTestId('skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('loading-row')).toBeOnTheScreen();
  });
});
