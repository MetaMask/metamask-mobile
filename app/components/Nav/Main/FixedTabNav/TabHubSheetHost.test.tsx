import React, { useEffect } from 'react';
import { Text } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { TabHubSheetHostProvider, useTabHubSheetHost } from './TabHubSheetHost';

const SHEET_TEXT = 'Hosted order type sheet';

/**
 * Publishes `sheetNode` to the host once mounted. Renders its own children
 * inline so the test can tell hub content apart from hosted content.
 */
const SheetPublisher = ({
  sheetNode,
  children,
}: {
  sheetNode: React.ReactNode;
  children?: React.ReactNode;
}) => {
  const host = useTabHubSheetHost();

  useEffect(() => {
    host?.setHostedSheet(sheetNode);
  }, [host, sheetNode]);

  return <>{children}</>;
};

const InlineOnly = () => {
  const host = useTabHubSheetHost();
  return <>{host ? <Text>has-host</Text> : <Text>no-host</Text>}</>;
};

describe('TabHubSheetHost', () => {
  it('renders a published sheet above the host children', () => {
    const { getByText } = renderWithProvider(
      <TabHubSheetHostProvider>
        <SheetPublisher sheetNode={<Text>{SHEET_TEXT}</Text>}>
          <Text>Hub content</Text>
        </SheetPublisher>
      </TabHubSheetHostProvider>,
    );

    expect(getByText('Hub content')).toBeOnTheScreen();
    expect(getByText(SHEET_TEXT)).toBeOnTheScreen();
  });

  it('removes the sheet when the publisher unmounts', () => {
    const { getByText, queryByText, rerender } = renderWithProvider(
      <TabHubSheetHostProvider>
        <SheetPublisher sheetNode={<Text>{SHEET_TEXT}</Text>} />
      </TabHubSheetHostProvider>,
    );

    expect(getByText(SHEET_TEXT)).toBeOnTheScreen();

    rerender(
      <TabHubSheetHostProvider>
        <Text>Hub content</Text>
      </TabHubSheetHostProvider>,
    );

    expect(queryByText(SHEET_TEXT)).toBeNull();
  });

  it('clears the sheet when the publisher hides it', () => {
    const HideablePublisher = ({ open }: { open: boolean }) => {
      const host = useTabHubSheetHost();
      useEffect(() => {
        host?.setHostedSheet(open ? <Text>{SHEET_TEXT}</Text> : null);
      }, [host, open]);
      return null;
    };

    const { getByText, queryByText, rerender } = renderWithProvider(
      <TabHubSheetHostProvider>
        <HideablePublisher open />
      </TabHubSheetHostProvider>,
    );

    expect(getByText(SHEET_TEXT)).toBeOnTheScreen();

    rerender(
      <TabHubSheetHostProvider>
        <HideablePublisher open={false} />
      </TabHubSheetHostProvider>,
    );

    expect(queryByText(SHEET_TEXT)).toBeNull();
  });

  it('returns null outside a host so screens render their sheet inline', () => {
    const { getByText } = renderWithProvider(<InlineOnly />);
    expect(getByText('no-host')).toBeOnTheScreen();
  });
});
