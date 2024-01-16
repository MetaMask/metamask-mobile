import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import DeleteMetaMetricsData from './DeleteMetaMetricsData';
import MetaMetrics from '../../../../../core/Analytics/MetaMetrics';
import { DataDeleteStatus } from '../../../../../core/Analytics';
import {strings} from "../../../../../../locales/i18n";
import renderWithProvider from "../../../../../util/test/renderWithProvider";

jest.mock('../../../../../core/Analytics/MetaMetrics', () => {
  return {
    getInstance: jest.fn(),
  };
});

describe('DeleteMetaMetricsData', () => {
  beforeEach(() => {
    // Reset the mock before each test
    (MetaMetrics.getInstance as jest.Mock).mockReset();
  });

  const currentDate = '2022-01-01';
  const stringWithSuffix = (suffix:string) => strings('app_settings.delete_metrics_description_part_' + suffix);

  const testCases = [
    // when user is opeted-in
    // { name: 'user is on settings before any deletion', userOptedIn: true, deletionRequestedOnThisScreenLifecycle: false, inProgress: false, descriptionParts: ['one','two',
    //   'three'], buttonDisabled: false },
    {  name: 'user on settings just after successful deletion', userOptedIn: true, deletionRequestedOnThisScreenLifecycle: true, inProgress: true, descriptionParts: ['four','five'] , doDeletion:true, buttonDisabled: true },
    // { name: 'user is back on the settings screen after succesful deletion', userOptedIn: true, deletionRequestedOnThisScreenLifecycle: false, inProgress: true, descriptionParts: ['four','five'], buttonDisabled: false  },
    // { name: 'user is on settings just after deletion request failed', userOptedIn: true, deletionRequestedOnThisScreenLifecycle: true, inProgress: true, descriptionParts: ['one','two',
    //   'three'], buttonDisabled: false  },
    //
    // //when user is opted-out
    // { name: 'user is on settings before any deletion', userOptedIn: false, deletionRequestedOnThisScreenLifecycle: false, inProgress: false, descriptionParts: ['one','two',
    //   'three'] , buttonDisabled: false },
    // { name: 'user on settings just after successful deletion', userOptedIn: false, deletionRequestedOnThisScreenLifecycle: true, inProgress: false, descriptionParts: ['four','five'], buttonDisabled: true  },
    // { name: 'user is back on the settings screen after succesful deletion', userOptedIn: false, deletionRequestedOnThisScreenLifecycle: false, inProgress: true, descriptionParts: ['four','five'], buttonDisabled: true  },
    // { name: 'user is on settings just after deletion request failed', userOptedIn: false, deletionRequestedOnThisScreenLifecycle: true, inProgress: true, descriptionParts: ['one','two',
    //   'three'], buttonDisabled: false },
  ];

  testCases.forEach(({ name, userOptedIn, deletionRequestedOnThisScreenLifecycle, inProgress, descriptionParts, doDeletion, buttonDisabled }) => {
    it(`renders deletion ${buttonDisabled?'disabled':'possible'} when ${userOptedIn?'opted-in':'opted-out'} ${name}`, async () => {
      (MetaMetrics.getInstance as jest.Mock).mockResolvedValue({
        checkDataDeleteStatus: jest.fn().mockResolvedValue({
          deletionRequestDate: deletionRequestedOnThisScreenLifecycle ? currentDate : null,
          dataDeletionRequestStatus: inProgress ? DataDeleteStatus.initialized : DataDeleteStatus.unknown,
        }),
        isEnabled: jest.fn().mockReturnValue(userOptedIn),
      });

      const {getByRole, getByTestId, getByText} = renderWithProvider(<DeleteMetaMetricsData />);

      const button = getByTestId('delete-metrics-button');

      await waitFor(() => {
        expect(button).toBeTruthy();
      });

      if(doDeletion) {
        expect(button.props.disabled).toBeFalsy();
        button.props.onPress();
        const clearButton = getByRole('button',{
          name: strings('app_settings.clear')
        });
        await waitFor(() => {
          expect(clearButton).toBeTruthy();
          expect(getByText(strings('app_settings.delete_metrics_confirm_modal_title'))).toBeTruthy();
        });
        clearButton.props.onPress();
        await waitFor(() => {
          expect(getByText(currentDate)).toBeTruthy();
        });
      }
      //
      // await waitFor(() => {
      //   descriptionParts.forEach(descriptionPart => {
      //     expect(getByText(stringWithSuffix(descriptionPart))).toBeTruthy();
      //   });
      //   if(buttonDisabled) {
      //     expect(getByText(currentDate)).toBeTruthy();
      //   }
      // });
    });
  });
});

describe('getResult function', () => {
  function getResult(userOptedIn: boolean, dataTrackedSinceLastDeletion: boolean, inProgress: boolean): boolean {
    return !(!dataTrackedSinceLastDeletion && inProgress);
  }

  test('should match the initial table', () => {
    expect(getResult(true, true, false)).toBeTruthy();//user is on settings before any deletion
    expect(getResult(true, true, true)).toBeTruthy();//back on the settings screen after succesful deletion
    expect(getResult(true, true, false)).toBeTruthy();//just after deletion request but failure
    expect(getResult(false, false, false)).toBeTruthy();//user is on settings before any deletion
    expect(getResult(false, false, false)).toBeTruthy();//just after deletion request but failure

    expect(getResult(true, false, true)).toBeFalsy();//on settings just after successful deletion
    expect(getResult(false, false, true)).toBeFalsy();//on settings just after successful deletion
    expect(getResult(false, false, true)).toBeFalsy();//back on the settings screen after succesful deletion
  });
});
