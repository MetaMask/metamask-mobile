import { TraceContext, trace } from '../../../util/trace';

let networkSwitchParentSpan: TraceContext;

const getNetworkSwitchParentSpan = () => {
  if (!networkSwitchParentSpan) {
    networkSwitchParentSpan = trace({ name: 'Network switch' });
  }

  return networkSwitchParentSpan;
};

export default getNetworkSwitchParentSpan;
