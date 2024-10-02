import { Connection } from '@core/SDKConnect/Connection';

function pause({ instance }: { instance: Connection }) {
  instance.remote.pause();
  instance.isResumed = false;
}

export default pause;
