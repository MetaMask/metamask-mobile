# TypeScript Conversion Todo List for utils.ts

## Types that can be immediately deduced:
- [x] Type for `flushPromises`: Function returning `Promise<void>`
- [x] Type for `FIXTURE_SERVER_PORT`: `number`
- [x] Type for `testConfig`: `TestConfig` interface with `fixtureServerPort?: number`
- [x] Type for `isTest`: `boolean`
- [x] Type for `isE2E`: `boolean`
- [x] Type for `getFixturesServerPortInApp`: Function returning `number`

## Types that require further information gathering:
- [ ] Type for `process.env.METAMASK_ENVIRONMENT`
- [ ] Type for `process.env.IS_TEST`

## Notes:
- The `flushPromises` function uses `setImmediate`, which is not available in all environments. We may need to add a type declaration for it.
- We need to ensure that the `process.env` types are correctly defined, possibly in a separate declaration file.
