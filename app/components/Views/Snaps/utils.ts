export const generateSnapIframeId = (snapId: string): string =>
  `iframe-snap-${snapId}`;

export const wrapSourceCodeInIframe = (
  sourceCode: string,
  iframeId: string,
): string => `
    <iframe id="${iframeId}" name="${iframeId}" srcdoc="${sourceCode}"></iframe>
  `;

export const generateBasicHTMLWithIframes = (
  iframesArray: string[],
): string => {
  const iframes = iframesArray.join('');
  return `
    <body
      style="display: flex; justify-content: center; flex-direction: column; align-items: center;"
    >
      <button
        onclick="sendDataToReactNativeApp()"
        style="padding: 20; width: 200; font-size: 30; color: white; background-color: #6751ff;"
      >Send data to app</button>
      <div>
        <p id="myContent">Basic HTML</p>
          ${iframes}
      </div>
    </body>
    `;
};

export const wrapCodeInScriptTags = (codeSource: string): string => `
  <script src="${codeSource}"></script>
`;

export const wrapScriptInHTML = (script: string): string => `
  <!DOCTYPE html><html><head>${script}</head></html>
`;
