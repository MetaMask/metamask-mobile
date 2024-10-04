import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import InfoSection from '../InfoRow/InfoSection';
import InfoRow from '../InfoRow';
import ExpandableSection from './ExpandableSection';

describe('ExpandableSection', () => {
  it('should match snapshot for simple ExpandableSection', async () => {
    const container = render(
      <ExpandableSection
        content={
          <View>
            <Text>Open</Text>
          </View>
        }
        modalContent={
          <InfoSection>
            <InfoRow label="label-Key">Value-Text</InfoRow>
          </InfoSection>
        }
        modalTitle={'Title'}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('should display default content', async () => {
    const { getByText } = render(
      <ExpandableSection
        content={
          <View>
            <Text>Open</Text>
          </View>
        }
        modalContent={
          <InfoSection>
            <InfoRow label="label-Key">Value-Text</InfoRow>
          </InfoSection>
        }
        modalTitle={'Title'}
      />,
    );
    expect(getByText('Open')).toBeDefined();
  });

  it('should open modal when right icon is pressed', async () => {
    const { getByTestId, getByText } = render(
      <ExpandableSection
        content={
          <View>
            <Text>Open</Text>
          </View>
        }
        modalContent={
          <InfoSection>
            <InfoRow label="label-Key">Value-Text</InfoRow>
          </InfoSection>
        }
        modalTitle={'Title'}
      />,
    );
    expect(getByText('Open')).toBeDefined();
    fireEvent.press(getByTestId('openButtonTestId'));
    expect(getByText('Value-Text')).toBeDefined();
    fireEvent.press(getByTestId('closeButtonTestId'));
    expect(getByText('Open')).toBeDefined();
  });
});
