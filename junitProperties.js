module.exports = () => {
  return {
    JOB_NAME: process.env.JOB_NAME || '',
    RUN_ID: process.env.RUN_ID || '',
    PR_NUMBER: process.env.PR_NUMBER || '',
  };
};
