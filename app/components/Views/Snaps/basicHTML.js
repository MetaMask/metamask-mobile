// eslint-disable-next-line import/prefer-default-export
const basicHTML = (iframesArray) => {
  const iframes = iframesArray.join('');
  return `
    <body
      style="display: flex; justify-content: center; flex-direction: column; align-items: center;"
    >
      <button
        onclick="sendDataToReactNativeApp()"
        style="padding: 20; width: 200; font-size: 20; color: white; background-color: #6751ff;"
      >
      <div>
        <p id="myContent">Basic HTML</p>
        ${iframes}
      </div>
    </body>
  `;
};

const mockScript = 'alert("hello from iframe!");';

const mockIframe = `<iframe \
    src="https://metamask.github.io/iframe-execution-environment/0.9.1" \
    title="iframe Example 1" \
    width="400" height="300">\
  </iframe>`;

const jsCode = `(function (f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f();
    } else if (typeof define === "function" && define.amd) {
      define([], f);
    } else {
      var g;
  
      if (typeof window !== "undefined") {
        g = window;
      } else if (typeof global !== "undefined") {
        g = global;
      } else if (typeof self !== "undefined") {
        g = self;
      } else {
        g = this;
      }
  
      g.snap = f();
    }
  })(function () {
    var define, module, exports;
    return function () {
      function r(e, n, t) {
        function o(i, f) {
          if (!n[i]) {
            if (!e[i]) {
              var c = "function" == typeof require && require;
              if (!f && c) return c(i, !0);
              if (u) return u(i, !0);
              var a = new Error("Cannot find module '" + i + "'");
              throw a.code = "MODULE_NOT_FOUND", a;
            }
  
            var p = n[i] = {
              exports: {}
            };
            e[i][0].call(p.exports, function (r) {
              var n = e[i][1][r];
              return o(n || r);
            }, p, p.exports, r, e, n, t);
          }
  
          return n[i].exports;
        }
  
        for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
  
        return o;
      }
  
      return r;
    }()({
      1: [function (require, module, exports) {
        "use strict";
  
        Object.defineProperty(exports, "__esModule", {
          value: true
        });
        exports.onRpcRequest = exports.getMessage = void 0;
  
        const getMessage = originString => {
          return originString;
        };
  
        exports.getMessage = getMessage;
  
        const onRpcRequest = ({
          origin,
          request
        }) => {
          switch (request.method) {
            case 'hello':
              return wallet.request({
                method: 'snap_confirm',
                params: [{
                  prompt: getMessage(origin),
                  description: 'This custom confirmation is just for display purposes.',
                  textAreaContent: 'You sure I can'
                }]
              });
  
            default:
              throw new Error('Method not found.');
          }
        };
  
        exports.onRpcRequest = onRpcRequest;
      }, {}]
    }, {}, [1])(1);
  });`;

const safeExecEnv =
  'https://metamask.github.io/iframe-execution-environment/0.9.1';

export { basicHTML, mockIframe, jsCode, mockScript, safeExecEnv };
