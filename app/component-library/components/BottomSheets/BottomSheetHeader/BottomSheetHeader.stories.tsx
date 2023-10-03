/* eslint-disable no-console */
// Internal dependencies.
import { default as BottomSheetHeaderComponent } from './BottomSheetHeader';

const BottomSheetHeaderMeta = {
  title: 'Component Library / BottomSheets',
  component: BottomSheetHeaderComponent,
};
export default BottomSheetHeaderMeta;

export const BottomSheetHeader = {
  args: {
    children: 'Super Long BottomSheetHeader Title that may span 3 lines',
    onBack: () => {
      console.log('Back button clicked');
    },
    onClose: () => {
      console.log('Close button clicked');
    },
  },
};
