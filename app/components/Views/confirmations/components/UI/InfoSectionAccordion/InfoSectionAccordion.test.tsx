import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InfoSectionAccordion from './InfoSectionAccordion';

describe('InfoSectionAccordion', () => {
  it("opens and closes the accordion when it's collapsed by default", async () => {
    const testHeader = 'Test Header';
    const testContent = 'Test Content';

    const { getByText, queryByText } = renderWithProvider(
        <InfoSectionAccordion header={testHeader}>
            <Text>{testContent}</Text>
        </InfoSectionAccordion>,
        {
            state: stakingDepositConfirmationState,
        },
    );

    expect(getByText(testHeader)).toBeDefined();
    expect(queryByText(testContent)).toBeNull();

    fireEvent(getByText(testHeader), 'onPress');

    expect(getByText(testHeader)).toBeDefined();
    expect(getByText(testContent)).toBeDefined();

    fireEvent(getByText(testHeader), 'onPress');

    expect(getByText(testHeader)).toBeDefined();
    expect(queryByText(testContent)).toBeNull();
  });

  it("opens and closes the accordion when it's expanded by default", async () => {
    const testHeader = 'Test Header';
    const testContent = 'Test Content';

    const { getByText, queryByText } = renderWithProvider(
        <InfoSectionAccordion header={testHeader} initiallyExpanded>
            <Text>{testContent}</Text>
        </InfoSectionAccordion>,
        {
            state: stakingDepositConfirmationState,
        },
    );

    expect(getByText(testHeader)).toBeDefined();
    expect(getByText(testContent)).toBeDefined();

    fireEvent(getByText(testHeader), 'onPress');

    expect(getByText(testHeader)).toBeDefined();
    expect(queryByText(testContent)).toBeNull();

    fireEvent(getByText(testHeader), 'onPress');

    expect(getByText(testHeader)).toBeDefined();
    expect(getByText(testContent)).toBeDefined();
  });
});
