import { RootState } from '../reducers';

const selectRequestRejectionInfo = (state: RootState) =>
  state.requests.rejections;

export default selectRequestRejectionInfo;
