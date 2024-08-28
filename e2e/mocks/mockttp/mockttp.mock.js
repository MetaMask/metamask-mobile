
const originalFetch = global.fetch;

global.fetch = async (url, options) => {
  // Log the request details
  console.log('Request URLLL:', url);
  console.log('Request Options:', options);

  // Call the original fetch function
  const response = await originalFetch(url, options);
  // Log the response details
  console.log('Response Status:', response.status);
  console.log('Response Headers:', response.headers);

  // Read and log the response body (assuming it's JSON)
  const responseBody = await response.json();
  console.log('Response Body:', responseBody);

  // Return the original response
  return response;
};
