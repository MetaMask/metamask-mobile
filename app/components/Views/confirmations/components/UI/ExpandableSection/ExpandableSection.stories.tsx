import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { Text, View } from 'react-native';

import InfoSection from '../InfoRow/InfoSection';
import InfoRow from '../InfoRow';
import ExpandableSection from './ExpandableSection';

storiesOf('Confirmations / ExpandableSection', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
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
    />
  ));
