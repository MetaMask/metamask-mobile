module.exports = (testResult) => {
  return {
    "dd_tags[test.invocations]": testResult.invocations,
  };
};