// Third party dependencies.
import React from 'react';

// Internal dependencies.
import HeaderCollapsible from '../HeaderCollapsible';
import TitleSubpage from '../TitleSubpage';
import { HeaderCollapsibleSubpageProps } from './HeaderCollapsibleSubpage.types';

/**
 * HeaderCollapsibleSubpage is a collapsing header component that combines
 * HeaderCollapsible with TitleSubpage as the expanded content.
 *
 * @example
 * ```tsx
 * const { onScroll, scrollY, expandedHeight, setExpandedHeight } = useHeaderCollapsible();
 *
 * return (
 *   <View style={{ flex: 1 }}>
 *     <HeaderCollapsibleSubpage
 *       title="Token Name"
 *       onBack={handleBack}
 *       titleSubpageProps={{
 *         startAccessory: <AvatarToken />,
 *         title: "Token Name",
 *         bottomLabel: "$1,234.56",
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
const HeaderCollapsibleSubpage: React.FC<HeaderCollapsibleSubpageProps> = ({
  titleSubpage,
  titleSubpageProps,
  ...props
}) => {
  // Render title section content
  const renderExpandedContent = () => {
    if (titleSubpage) {
      return titleSubpage;
    }
    if (titleSubpageProps) {
      return (
        <TitleSubpage
          {...titleSubpageProps}
          twClassName={`px-4 pt-1 pb-3 ${titleSubpageProps?.twClassName ?? ''}`.trim()}
        />
      );
    }
    return null;
  };

  return (
    <HeaderCollapsible {...props} expandedContent={renderExpandedContent()} />
  );
};

export default HeaderCollapsibleSubpage;
