import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { SectionId } from '../../../sections.config';
import PillRow from './PillRow';
import SectionCard, { type SectionCardProps } from './SectionCard';

/**
 * One pill: stable `key` (E2E), visible `name`, items passed to the section's `RowItem`s.
 * Order in the parent array = left to right in the UI.
 */
export interface PillToggledTab {
  key: string;
  name: string;
  items: unknown[];
}

export interface PillToggledCardSectionProps
  extends Pick<SectionCardProps, 'listTestId'> {
  sectionId: SectionId;
  isLoading: boolean;
  pills: PillToggledTab[];
  /** If omitted, the first tab is selected. */
  defaultPillKey?: string;
  testIdPrefix?: string;
}

const DEFAULT_TEST_ID_PREFIX = 'pill-toggled-section';

const PillToggledCardSection: React.FC<PillToggledCardSectionProps> = ({
  sectionId,
  isLoading,
  pills,
  defaultPillKey,
  listTestId,
  testIdPrefix = DEFAULT_TEST_ID_PREFIX,
}) => {
  const firstKey = pills[0]?.key ?? '';
  const [activeKey, setActiveKey] = useState(defaultPillKey ?? firstKey);

  const active = pills.find((p) => p.key === activeKey) ?? pills[0];

  return (
    <Box testID={testIdPrefix} twClassName="mb-6">
      <PillRow
        pills={pills}
        activeKey={activeKey}
        onSelect={setActiveKey}
        testIdPrefix={testIdPrefix}
      />
      <SectionCard
        sectionId={sectionId}
        data={active?.items ?? []}
        isLoading={isLoading}
        listTestId={listTestId}
      />
    </Box>
  );
};

export default PillToggledCardSection;
