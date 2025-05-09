import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import InfoSection from '../info-row/info-section';
import InfoRow from '../info-row/info-row';
import Expandable from './expandable';

describe('Expandable', () => {
  it('should render correctly for simple Expandable', async () => {
    const { getByText } = render(
      <Expandable
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
      <Expandable
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
      <Expandable
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
