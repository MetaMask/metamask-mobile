import { useEffect, useState } from 'react';
import AppConfig from './AppConfig';
import { FetchState } from '../../../util/fetch/FetchState';
import { MM_APP_CONFIG_TEST_URL } from '../../../constants/urls';

type State = FetchState<AppConfig>;
const initialState: Readonly<State> = {
  type: 'Loading',
};

const useAppConfig = (): State => {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    const fetchAppConfig = () => {
      fetch(MM_APP_CONFIG_TEST_URL)
        .then((response) => response.json())
        .then((data) => {
          try {
            const minimumVersions = data.security.minimumVersions;
            const appConfig: AppConfig = {
              security: {
                minimumVersions: {
                  appMinimumBuild: minimumVersions.appMinimumBuild,
                  appleMinimumOS: minimumVersions.appleMinimumOS,
                  androidMinimumAPIVersion:
                    minimumVersions.androidMinimumAPIVersion,
                },
              },
            };
            setState({ type: 'Success', data: appConfig });
          } catch (e: any) {
            setState({
              type: 'Error',
              error: e,
              message: `error parsing AppConfig ${e.message}`,
            });
          }
        })
        .catch((e: any) => {
          setState({
            type: 'Error',
            error: e,
            message: `error fetching AppConfig ${e.message}`,
          });
        });
    };

    fetchAppConfig();
  }, []);

  return state;
};

export default useAppConfig;
