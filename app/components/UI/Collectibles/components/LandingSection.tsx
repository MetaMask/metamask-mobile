import React, { type ReactNode } from 'react';
import { SectionHeader } from '@metamask/design-system-react-native';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

interface Props {
  name: string;
  title: string;
  children?: ReactNode;
}

// Titled slot on the main page; its story supplies the content.
export function LandingSection({ name, title, children }: Props) {
  return (
    <View testID={collectiblesTestIds.landingSection(name)}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}
