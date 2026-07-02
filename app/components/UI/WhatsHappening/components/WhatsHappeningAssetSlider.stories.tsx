// WhatsHappeningAssetSlider stories disabled — re-enable when PerpsStreamProvider
// story wrapper is available without breaking Storybook startup.
//
// /* eslint-disable no-console */
// import React from 'react';
// import { ScrollView } from 'react-native';
// import { useTailwind } from '@metamask/design-system-twrnc-preset';
// import {
//   Box,
//   BoxAlignItems,
//   BoxBackgroundColor,
//   BoxFlexDirection,
//   FontWeight,
//   Text,
//   TextColor,
//   TextVariant,
// } from '@metamask/design-system-react-native';
// import WhatsHappeningAssetSlider from './WhatsHappeningAssetSlider';
// // import { WhatsHappeningSource } from '../constants';
// // import type { WhatsHappeningItem } from '../types';
// // import { WhatsHappeningAssetSliderStoryWrapper } from '../__storybook__/WhatsHappeningAssetSliderStoryWrapper';
//
// const mockAssets = [
//   {
//     sourceAssetId: 'btc',
//     symbol: 'BTC',
//     name: 'Bitcoin',
//     caip19: [],
//     hlPerpsMarket: ['BTC'],
//   },
//   {
//     sourceAssetId: 'eth',
//     symbol: 'ETH',
//     name: 'Ethereum',
//     caip19: [],
//     hlPerpsMarket: ['ETH'],
//   },
//   {
//     sourceAssetId: 'sol',
//     symbol: 'SOL',
//     name: 'Solana',
//     caip19: [],
//     hlPerpsMarket: ['SOL'],
//   },
// ] as const;
//
// // const mockItem: WhatsHappeningItem = {
// //   id: 'story-item',
// //   title: 'Markets rally on macro data',
// //   description: 'Sample headline for Storybook',
// //   date: '2026-01-01T00:00:00.000Z',
// //   impact: 'positive',
// //   relatedAssets: [...mockAssets],
// //   articles: [],
// // };
//
// function AssetScrollerFixture() {
//   const tw = useTailwind();
//
//   return (
//     <ScrollView
//       horizontal
//       showsHorizontalScrollIndicator={false}
//       contentContainerStyle={tw.style('flex-row gap-2 p-4')}
//     >
//       {mockAssets.map((asset) => (
//         <Box
//           key={asset.symbol}
//           flexDirection={BoxFlexDirection.Row}
//           alignItems={BoxAlignItems.Center}
//           backgroundColor={BoxBackgroundColor.BackgroundMuted}
//           twClassName="rounded-full px-3 py-2 gap-2"
//         >
//           <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
//             {asset.symbol}
//           </Text>
//           <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
//             +2.4%
//           </Text>
//         </Box>
//       ))}
//     </ScrollView>
//   );
// }
//
// const WhatsHappeningAssetSliderMeta = {
//   title: 'Components / UI / Sliders / WhatsHappeningAssetSlider',
//   component: WhatsHappeningAssetSlider,
// };
//
// export default WhatsHappeningAssetSliderMeta;
//
// export const HorizontalAssetScroller = {
//   render: () => <AssetScrollerFixture />,
// };
//
// // IntegratedComponent requires PerpsStreamProvider — disabled until story
// // wrapper is re-enabled. Use HorizontalAssetScroller for visual preview.
// // export const IntegratedComponent = {
// //   render: () => (
// //     <WhatsHappeningAssetSliderStoryWrapper>
// //       <Box twClassName="p-4 gap-2">
// //         <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
// //           Mock perps stream data — BTC, ETH, and SOL pills with live price
// //           labels.
// //         </Text>
// //         <WhatsHappeningAssetSlider
// //           assets={[...mockAssets]}
// //           item={mockItem}
// //           cardIndex={0}
// //           source={WhatsHappeningSource.Homepage}
// //         />
// //       </Box>
// //     </WhatsHappeningAssetSliderStoryWrapper>
// //   ),
// // };

export default {
  title: 'Components / UI / Sliders / WhatsHappeningAssetSlider (disabled)',
};
