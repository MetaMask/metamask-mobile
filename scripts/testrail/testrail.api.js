const axios = require('axios');
require('dotenv').config({ path: './.js.env' });

const TESTRAIL_MM_API_URL = 'https://mmig.testrail.io/index.php?/api/v2';
const TESTRAIL_PROJECT_ID = 4;
const AUTH_TOKEN = process.env.TESTRAIL_AUTH_TOKEN;
const automatedTestCasesEndpoint = `${TESTRAIL_MM_API_URL}/get_cases/${TESTRAIL_PROJECT_ID}&refs=@automated`;
const addTestRun = `${TESTRAIL_MM_API_URL}/add_run/${TESTRAIL_PROJECT_ID}`;
const getAutomatedTestRun = `${TESTRAIL_MM_API_URL}/get_tests/`;
const addResults = `${TESTRAIL_MM_API_URL}/add_results/`;

axios.defaults.headers.common.Authorization = `Basic ${AUTH_TOKEN}`;
let runID;

axios
  .get(automatedTestCasesEndpoint)
  .then((response) => {
    const automatedcaseids = response.data.cases.map(
      (automatedcase) => automatedcase.id,
    );
    console.log(`test case id count: ${automatedcaseids.length}`);
    return axios.post(addTestRun, {
      name: 'Automated Test Run on bitrise release_e2e_pipline',
      description: 'Automated test run on release branch',
      include_all: false,
      case_ids: automatedcaseids,
    });
  })
  .then((response) => {
    runID = response.data.id;
    return axios.get(`${getAutomatedTestRun}${runID}`);
  })
  .then((response) => {
    const automatedResults = response.data.tests.map((test) => ({
      test_id: test.id,
      status_id: 1,
      comment: 'Passed on bitrise',
    }));
    return axios.post(`${addResults}${runID}`, {
      results: automatedResults,
    });
  })
  .catch((error) => {
    console.error(`Error retrieving automated test cases: ${error}`);
  });
