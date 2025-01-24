import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import InfoSection from '../InfoRow/InfoSection';
import InfoRow from '../InfoRow';
import ExpandableSection from './ExpandableSection';

describe('ExpandableSection', () => {
  it('should render correctly for simple ExpandableSection', async () => {
    const { getByText } = render(
      <ExpandableSection
        collapsedContent={
          <View>
            <Text>Open</Text>
          </View>
        }
        expandedContent={
          <InfoSection>
            <InfoRow label="label-Key">Value-Text</InfoRow>
          </InfoSection>
        }
        expandedContentTitle={'Title'}
      />,
    );
    expect(getByText('Open')).toBeDefined();
  });

  it('should display default content', async () => {
    const { getByText } = render(
      <ExpandableSection
        collapsedContent={
          <View>
            <Text>Open</Text>
          </View>
        }
        expandedContent={
          <InfoSection>
            <InfoRow label="label-Key">Value-Text</InfoRow>
          </InfoSection>
        }
        expandedContentTitle={'Title'}
      />,
    );
    expect(getByText('Open')).toBeDefined();
  });

  it('should open modal when right icon is pressed', async () => {
    const { getByTestId, getByText } = render(
      <ExpandableSection
        collapsedContent={
          <View>
            <Text>Open</Text>
          </View>
        }
        expandedContent={
          <InfoSection>
            <InfoRow label="label-Key">Value-Text</InfoRow>
          </InfoSection>
        }
        expandedContentTitle={'Title'}
      />,
    );
    expect(getByText('Open')).toBeDefined();
    fireEvent.press(getByText('Open'));
    expect(getByText('Value-Text')).toBeDefined();
    fireEvent.press(getByTestId('collapseButtonTestID'));
    expect(getByText('Open')).toBeDefined();
  });
});
