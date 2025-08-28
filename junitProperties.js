module.exports = () => {
  return {
    "JOB_NAMEE": process.env.JOB_NAME || '',
    "RUN_IDD": process.env.RUN_ID || '',
    "PR_NUMBERR": process.env.PR_NUMBER || ''
  };
};