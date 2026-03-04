// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderCollapsible from '../HeaderCollapsible';
import TitleStandard from '../TitleStandard';
import { HeaderCollapsibleStandardProps } from './HeaderCollapsibleStandard.types';

/**
 * HeaderCollapsibleStandard is a collapsing header component that combines
 * HeaderCollapsible with TitleStandard as the expanded content.
 *
 * @example
 * ```tsx
 * const { onScroll, scrollY, expandedHeight, setExpandedHeight } = useHeaderCollapsible();
 *
 * return (
 *   <View style={{ flex: 1 }}>
 *     <HeaderCollapsibleStandard
 *       title="Send"
 *       onBack={handleBack}
 *       titleStandardProps={{
 *         topLabel: "Send",
 *         title: "$4.42",
 *       }}
 *       scrollY={scrollY}
 *       onExpandedHeightChange={setExpandedHeight}
 *     />
 *     <ScrollView
 *       onScroll={onScroll}
 *       scrollEventThrottle={16}
 *       contentContainerStyle={{ paddingTop: expandedHeight }}
 *     >
 *       <Content />
 *     </ScrollView>
 *   </View>
 * );
 * ```
 */
const HeaderCollapsibleStandard: React.FC<HeaderCollapsibleStandardProps> = ({
  titleStandard,
  titleStandardProps,
  ...props
}) => {
  // Render title section content
  const renderExpandedContent = () => {
    if (titleStandard) {
      return titleStandard;
    }
    if (titleStandardProps) {
      return (
        <TitleStandard
          {...titleStandardProps}
          twClassName={`px-4 pt-1 pb-3 ${titleStandardProps?.twClassName ?? ''}`.trim()}
        />
      );
    }
    return null;
  };

  return (
    <HeaderCollapsible {...props} expandedContent={renderExpandedContent()} />
  );
};

export default HeaderCollapsibleStandard;
