# Script to run Flask E2E tests with the correct environment variables
export METAMASK_BUILD_TYPE="flask"
export IS_TEST="true"
yarn test:e2e:ios:run:qa-release "$@"
