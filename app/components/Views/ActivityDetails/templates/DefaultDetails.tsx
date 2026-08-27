import React from 'react';
import { ActivityDetailsAmountHeader } from '../components';
import type { ActivityDetailsTemplateProps } from '../ActivityDetails.types';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

/**
 * Generic, type-agnostic details layout used as the fallback for any activity
 * kind without a dedicated template. Mirrors the extension's `DefaultDetails`.
 * The footer is pinned to the bottom of the screen.
 */
export function DefaultDetails({ item }: ActivityDetailsTemplateProps) {
  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ActivityDetailsAmountHeader item={item} />}
      showFeesAndTotal={false}
    />
  );
}
