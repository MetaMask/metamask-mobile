(function() {
	function e(t, n, r) {
		function s(o, u) {
			if (!n[o]) {
				if (!t[o]) {
					const a = typeof require === 'function' && require;
					if (!u && a) return a(o, !0);
					if (i) return i(o, !0);
					const f = new Error("Cannot find module '" + o + "'");
					throw ((f.code = 'MODULE_NOT_FOUND'), f);
				}
				const l = (n[o] = { exports: {} });
				t[o][0].call(
					l.exports,
					(e) => {
						const n = t[o][1][e];
						return s(n || e);
					},
					l,
					l.exports,
					e,
					t,
					n,
					r
				);
			}
			return n[o].exports;
		}
		var i = typeof require === 'function' && require;
		for (let o = 0; o < r.length; o++) s(r[o]);
		return s;
	}
	return e;
})()(
	{
		1: [
			function(require, module, exports) {
				const copy = require('copy-to-clipboard');
				document.addEventListener('keypress', (e) => {
					if (99 === e.keyCode) {
						let r = document.querySelector('svg'),
							o = r.innerHTML;
						copy(
							'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"> <svg width="521px" height="521px" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events">' +
								o +
								'</svg>'
						);
					}
				});
				let createViewer = require('../index'),
					viewer = createViewer({ width: 1, height: 1, followMouse: !0, followMotion: !0 });
				document.body.appendChild(viewer.container);
			},
			{ '../index': 3, 'copy-to-clipboard': 4 }
		],
		2: [
			function(require, module, exports) {
				module.exports = {
					positions: [
						[111.0246, 52.6046, 46.2259],
						[114.025, 87.6733, 58.9818],
						[66.192, 80.898, 55.3943],
						[72.1133, 35.4918, 30.8714],
						[97.8045, 116.561, 73.9788],
						[16.7623, 58.0109, 58.0782],
						[52.6089, 30.3641, 42.5561],
						[106.8814, 31.9455, 46.9133],
						[113.4846, 38.6049, 49.1215],
						[108.6633, 43.2332, 46.3154],
						[101.2166, 15.9822, 46.3082],
						[16.6605, -16.2883, 93.6187],
						[40.775, -10.2288, 85.2764],
						[23.9269, -2.5103, 86.7365],
						[11.1691, -7.0037, 99.3776],
						[9.5692, -34.3939, 141.672],
						[12.596, 7.1655, 88.741],
						[61.1809, 8.8142, 76.9968],
						[39.7195, -28.9271, 88.9638],
						[13.7962, -68.5757, 132.057],
						[15.2674, -62.32, 129.688],
						[14.8446, -52.6096, 140.113],
						[12.8917, -49.7716, 144.741],
						[35.6042, -71.758, 81.0639],
						[47.4625, -68.6061, 63.3697],
						[38.2486, -64.7302, 38.9099],
						[-12.8917, -49.7716, 144.741],
						[-13.7962, -68.5757, 132.057],
						[17.8021, -71.758, 81.0639],
						[19.1243, -69.0168, 49.4201],
						[38.2486, -66.2756, 17.7762],
						[12.8928, -36.7035, 141.672],
						[109.284, -93.5899, 27.8243],
						[122.118, -36.8894, 35.025],
						[67.7668, -30.197, 78.4178],
						[33.1807, 101.852, 25.3186],
						[9.4063, -35.5898, 150.722],
						[-9.5692, -34.3939, 141.672],
						[-9.4063, -35.5898, 150.722],
						[11.4565, -37.8994, 150.722],
						[-12.596, 7.1655, 88.741],
						[-11.1691, -7.0037, 99.3776],
						[70.2365, 62.8362, -3.9475],
						[47.2634, 54.294, -27.4148],
						[28.7302, 91.7311, -24.9726],
						[69.1676, 6.5862, -12.7757],
						[28.7302, 49.1003, -48.3596],
						[31.903, 5.692, -47.822],
						[35.0758, -34.4329, -16.2809],
						[115.2841, 48.6815, 48.6841],
						[110.8428, 28.4821, 49.1762],
						[-19.1243, -69.0168, 49.4201],
						[-38.2486, -66.2756, 17.7762],
						[-111.0246, 52.6046, 46.2259],
						[-72.1133, 35.4918, 30.8714],
						[-66.192, 80.898, 55.3943],
						[-114.025, 87.6733, 58.9818],
						[-97.8045, 116.561, 73.9788],
						[-52.6089, 30.3641, 42.5561],
						[-16.7623, 58.0109, 58.0782],
						[-106.8814, 31.9455, 46.9133],
						[-108.6633, 43.2332, 46.3154],
						[-113.4846, 38.6049, 49.1215],
						[-101.2166, 15.9822, 46.3082],
						[-16.6605, -16.2883, 93.6187],
						[-23.9269, -2.5103, 86.7365],
						[-40.775, -10.2288, 85.2764],
						[-61.1809, 8.8142, 76.9968],
						[-39.7195, -28.9271, 88.9638],
						[-14.8446, -52.6096, 140.113],
						[-15.2674, -62.32, 129.688],
						[-47.4625, -68.6061, 63.3697],
						[-35.6042, -71.758, 81.0639],
						[-38.2486, -64.7302, 38.9099],
						[-17.8021, -71.758, 81.0639],
						[-12.8928, -36.7035, 141.672],
						[-67.7668, -30.197, 78.4178],
						[-122.118, -36.8894, 35.025],
						[-109.284, -93.5899, 27.8243],
						[-33.1807, 101.852, 25.3186],
						[-11.4565, -37.8994, 150.722],
						[-70.2365, 62.8362, -3.9475],
						[-28.7302, 91.7311, -24.9726],
						[-47.2634, 54.294, -27.4148],
						[-69.1676, 6.5862, -12.7757],
						[-28.7302, 49.1003, -48.3596],
						[-31.903, 5.692, -47.822],
						[-35.0758, -34.4329, -16.2809],
						[-115.2841, 48.6815, 48.6841],
						[-110.8428, 28.4821, 49.1762]
					],
					chunks: [
						{
							color: [246, 133, 27],
							faces: [
								[17, 33, 10],
								[17, 18, 34],
								[34, 33, 17],
								[10, 6, 17],
								[11, 15, 31],
								[31, 18, 11],
								[18, 12, 11],
								[14, 16, 40],
								[40, 41, 14],
								[59, 5, 35],
								[35, 79, 59],
								[67, 63, 77],
								[67, 77, 76],
								[76, 68, 67],
								[63, 67, 58],
								[64, 68, 75],
								[75, 37, 64],
								[68, 64, 66],
								[14, 41, 37],
								[37, 15, 14],
								[5, 59, 40],
								[40, 16, 5]
							]
						},
						{
							color: [228, 118, 27],
							faces: [
								[31, 24, 18],
								[6, 5, 16],
								[16, 17, 6],
								[24, 32, 33],
								[33, 34, 24],
								[5, 4, 35],
								[75, 68, 71],
								[58, 67, 40],
								[40, 59, 58],
								[71, 76, 77],
								[77, 78, 71]
							]
						},
						{
							color: [118, 61, 22],
							faces: [
								[0, 1, 2],
								[2, 3, 0],
								[4, 5, 2],
								[6, 3, 2],
								[2, 5, 6],
								[7, 8, 9],
								[10, 3, 6],
								[10, 50, 7],
								[7, 3, 10],
								[7, 9, 3],
								[49, 0, 9],
								[3, 9, 0],
								[53, 54, 55],
								[55, 56, 53],
								[57, 56, 55],
								[58, 59, 55],
								[55, 54, 58],
								[60, 61, 62],
								[63, 58, 54],
								[63, 60, 89],
								[60, 63, 54],
								[60, 54, 61],
								[88, 61, 53],
								[54, 53, 61],
								[2, 1, 4],
								[55, 59, 57]
							]
						},
						{
							color: [22, 22, 22],
							faces: [
								[36, 15, 37],
								[37, 38, 36],
								[31, 39, 22],
								[22, 21, 31],
								[31, 15, 36],
								[36, 39, 31],
								[75, 69, 26],
								[26, 80, 75],
								[75, 80, 38],
								[38, 37, 75],
								[38, 80, 39],
								[39, 36, 38],
								[39, 80, 26],
								[26, 22, 39]
							]
						},
						{
							color: [215, 193, 179],
							faces: [[21, 20, 24], [24, 31, 21], [69, 71, 70], [71, 69, 75]]
						},
						{
							color: [192, 173, 158],
							faces: [
								[19, 20, 21],
								[21, 22, 19],
								[20, 19, 23],
								[23, 24, 20],
								[23, 25, 24],
								[19, 22, 26],
								[26, 27, 19],
								[23, 28, 29],
								[23, 29, 30],
								[25, 23, 30],
								[29, 51, 52],
								[52, 30, 29],
								[27, 26, 69],
								[69, 70, 27],
								[70, 71, 72],
								[72, 27, 70],
								[72, 71, 73],
								[51, 74, 72],
								[52, 51, 72],
								[73, 52, 72],
								[19, 27, 74],
								[74, 28, 19],
								[51, 29, 28],
								[28, 74, 51],
								[74, 27, 72],
								[28, 23, 19]
							]
						},
						{
							color: [205, 97, 22],
							faces: [
								[24, 34, 18],
								[16, 13, 12],
								[12, 17, 16],
								[13, 16, 11],
								[71, 68, 76],
								[40, 67, 66],
								[66, 65, 40],
								[65, 64, 40]
							]
						},
						{
							color: [35, 52, 71],
							faces: [[11, 12, 13], [64, 65, 66]]
						},
						{
							color: [228, 117, 31],
							faces: [[14, 15, 11], [11, 16, 14], [17, 12, 18], [41, 64, 37], [67, 68, 66]]
						},
						{
							color: [226, 118, 27],
							faces: [
								[35, 4, 42],
								[4, 1, 42],
								[42, 43, 44],
								[44, 35, 42],
								[45, 43, 42],
								[42, 10, 45],
								[30, 32, 24],
								[24, 25, 30],
								[30, 33, 32],
								[33, 30, 10],
								[44, 43, 46],
								[43, 45, 47],
								[47, 46, 43],
								[48, 47, 45],
								[45, 30, 48],
								[30, 45, 10],
								[49, 42, 0],
								[8, 7, 42],
								[50, 42, 7],
								[50, 10, 42],
								[1, 0, 42],
								[42, 9, 8],
								[42, 49, 9],
								[64, 41, 40],
								[57, 59, 79],
								[79, 81, 57],
								[57, 81, 56],
								[82, 79, 35],
								[35, 44, 82],
								[81, 79, 82],
								[82, 83, 81],
								[84, 63, 81],
								[81, 83, 84],
								[44, 46, 85],
								[85, 82, 44],
								[52, 73, 71],
								[71, 78, 52],
								[52, 78, 77],
								[77, 63, 52],
								[82, 85, 83],
								[83, 85, 86],
								[86, 84, 83],
								[87, 52, 84],
								[84, 86, 87],
								[52, 63, 84],
								[88, 53, 81],
								[62, 81, 60],
								[89, 60, 81],
								[89, 81, 63],
								[56, 81, 53],
								[81, 62, 61],
								[81, 61, 88],
								[48, 87, 86],
								[86, 47, 48],
								[47, 86, 85],
								[85, 46, 47],
								[48, 30, 52],
								[52, 87, 48]
							]
						}
					]
				};
			},
			{}
		],
		3: [
			function(require, module, exports) {
				function createNode(t) {
					return document.createElementNS(SVG_NS, t);
				}
				function setAttribute(t, e, n) {
					t.setAttributeNS(null, e, n);
				}
				var perspective = require('gl-mat4/perspective'),
					multiply = require('gl-mat4/multiply'),
					lookAt = require('gl-mat4/lookAt'),
					invert = require('gl-mat4/invert'),
					rotate = require('gl-mat4/rotate'),
					transform = require('gl-vec3/transformMat4'),
					foxJSON = require('./fox.json'),
					SVG_NS = 'http://www.w3.org/2000/svg';
				module.exports = function(t) {
					function e(t) {
						const e = y.getBoundingClientRect();
						(x.x = 1 - (2 * (t.x - e.left)) / e.width), (x.y = 1 - (2 * (t.y - e.top)) / e.height);
					}
					function n(t, e) {
						(this.svg = t), (this.indices = e), (this.zIndex = 0);
					}
					function r(t) {
						for (
							let e = t[0],
								n = t[1],
								r = t[2],
								i = t[3],
								o = t[4],
								a = t[5],
								l = t[6],
								u = t[7],
								s = t[8],
								f = t[9],
								h = t[10],
								c = t[11],
								d = t[12],
								w = t[13],
								v = t[14],
								g = t[15],
								m = 0;
							m < F;
							++m
						) {
							let p = N[3 * m],
								A = N[3 * m + 1],
								y = N[3 * m + 2],
								x = p * i + A * u + y * c + g;
							(M[3 * m] = (p * e + A * o + y * s + d) / x),
								(M[3 * m + 1] = (p * n + A * a + y * f + w) / x),
								(M[3 * m + 2] = (p * r + A * l + y * h + v) / x);
						}
					}
					function i(t, e) {
						return e.zIndex - t.zIndex;
					}
					function o() {
						let t,
							e = y.getBoundingClientRect(),
							n = e.width,
							r = e.height;
						for (b.length = 0, t = 0; t < S.length; ++t) {
							let o = S[t],
								a = o.indices,
								l = a[0],
								u = a[1],
								s = a[2],
								f = M[3 * l],
								h = M[3 * l + 1],
								c = M[3 * u],
								d = M[3 * u + 1],
								w = M[3 * s];
							if (!((c - f) * (M[3 * s + 1] - h) - (d - h) * (w - f) < 0)) {
								for (var v = [], g = -1 / 0, m = 1 / 0, p = o.svg, A = 0; A < 3; ++A) {
									const x = a[A];
									v.push(0.5 * n * (1 - M[3 * x]) + ',' + 0.5 * r * (1 - M[3 * x + 1]));
									const F = M[3 * x + 2];
									(g = Math.max(g, F)), (m = Math.min(m, F));
								}
								o.zIndex = g + 0.25 * m;
								const N = v.join(' ');
								-1 === N.indexOf('NaN') && setAttribute(p, 'points', N), b.push(o);
							}
						}
						for (b.sort(i), y.innerHTML = '', t = 0; t < b.length; ++t) y.appendChild(b[t].svg);
					}
					function a() {
						v = !1;
					}
					function l() {
						v = !0;
					}
					function u(t) {
						c = t;
					}
					function s(t) {
						d = t;
					}
					function f() {
						if (v) {
							window.requestAnimationFrame(f);
							const t = 1 - m;
							y.getBoundingClientRect();
							(g[0] = t * g[0] + m * x.x), (g[1] = t * g[1] + m * x.y + 0.085);
							r(k()), o(), a();
						}
					}
					var h = t || {},
						c = !!h.followMouse,
						d = !!h.followMotion,
						w = !!h.slowDrift,
						v = !0,
						g = [0, 0],
						m = 0.3,
						p = h.width || 400,
						A = h.height || 400,
						y = createNode('svg'),
						x = { x: 0, y: 0 },
						F = foxJSON.positions.length,
						N = new Float32Array(3 * F),
						M = new Float32Array(3 * F),
						b = [];
					h.pxNotRatio ||
						((p = (window.innerWidth * (h.width || 0.25)) | 0),
						(A = 0 | (window.innerHeight * h.height || p)),
						'minWidth' in h &&
							p < h.minWidth &&
							((p = h.minWidth), (A = ((h.minWidth * h.height) / h.width) | 0))),
						setAttribute(y, 'width', p + 'px'),
						setAttribute(y, 'height', A + 'px'),
						document.body.appendChild(y),
						(function() {
							for (let t = foxJSON.positions, e = 0, n = 0; n < t.length; ++n)
								for (let r = t[n], i = 0; i < 3; ++i) N[e++] = r[i];
						})();
					var S = (function() {
							for (var t = [], e = 0; e < foxJSON.chunks.length; ++e)
								for (
									let r = foxJSON.chunks[e], i = 'rgb(' + r.color + ')', o = r.faces, a = 0;
									a < o.length;
									++a
								) {
									let l = o[a],
										u = createNode('polygon');
									setAttribute(u, 'fill', i),
										setAttribute(u, 'stroke', i),
										setAttribute(u, 'points', '0,0, 10,0, 0,10'),
										y.appendChild(u),
										t.push(new n(u, l));
								}
							return t;
						})(),
						k = (function() {
							let t = new Float32Array(3),
								e = new Float32Array([0, 1, 0]),
								n = new Float32Array(16),
								r = new Float32Array(16),
								i = lookAt(new Float32Array(16), new Float32Array([0, 0, 400]), t, e),
								o = invert(new Float32Array(16), i),
								a = new Float32Array(16),
								l = new Float32Array(3),
								u = new Float32Array(16),
								s = new Float32Array([1, 0, 0]),
								f = new Float32Array([0, 1, 0]),
								h = new Float32Array([0, 0, 1]);
							return function() {
								let c = y.getBoundingClientRect(),
									d = c.width,
									v = c.height;
								if (
									(perspective(n, Math.PI / 4, d / v, 100, 1e3),
									invert(a, n),
									(l[0] = g[0]),
									(l[1] = g[1]),
									(l[2] = 1.2),
									transform(l, l, a),
									transform(l, l, o),
									lookAt(r, t, l, e),
									w)
								) {
									const m = Date.now() / 1e3;
									rotate(r, r, 0.1 + 0.2 * Math.sin(m / 3), s),
										rotate(r, r, 0.03 * Math.sin(m / 2) - 0.1, h),
										rotate(r, r, 0.5 + 0.2 * Math.sin(m / 3), f);
								}
								return multiply(u, n, i), multiply(u, u, r), u;
							};
						})();
					return (
						window.addEventListener('mousemove', (t) => {
							v || l(), c && (e({ x: t.clientX, y: t.clientY }), f());
						}),
						window.addEventListener('deviceorientation', (t) => {
							if ((v || l(), d)) {
								const n = event.gamma,
									r = event.beta;
								(yOffset = -100),
									(acceleration = 5),
									e({ x: 200 + n * acceleration, y: yOffset + r * acceleration }),
									f();
							}
						}),
						f(),
						{
							container: y,
							lookAt: e,
							setFollowMouse: u,
							setFollowMotion: s,
							stopAnimation: a,
							startAnimation: l
						}
					);
				};
			},
			{
				'./fox.json': 2,
				'gl-mat4/invert': 6,
				'gl-mat4/lookAt': 7,
				'gl-mat4/multiply': 8,
				'gl-mat4/perspective': 9,
				'gl-mat4/rotate': 10,
				'gl-vec3/transformMat4': 11
			}
		],
		4: [
			function(require, module, exports) {
				'use strict';
				function format(e) {
					const t = (/mac os x/i.test(navigator.userAgent) ? '⌘' : 'Ctrl') + '+C';
					return e.replace(/#{\s*key\s*}/g, t);
				}
				function copy(e, t) {
					let o,
						r,
						n,
						c,
						s,
						a,
						l = !1;
					t || (t = {}), (o = t.debug || !1);
					try {
						(n = deselectCurrent()),
							(c = document.createRange()),
							(s = document.getSelection()),
							(a = document.createElement('span')),
							(a.textContent = e),
							(a.style.all = 'unset'),
							(a.style.position = 'fixed'),
							(a.style.top = 0),
							(a.style.clip = 'rect(0, 0, 0, 0)'),
							(a.style.whiteSpace = 'pre'),
							(a.style.webkitUserSelect = 'text'),
							(a.style.MozUserSelect = 'text'),
							(a.style.msUserSelect = 'text'),
							(a.style.userSelect = 'text'),
							document.body.appendChild(a),
							c.selectNode(a),
							s.addRange(c);
						if (!document.execCommand('copy')) throw new Error('copy command was unsuccessful');
						l = !0;
					} catch (n) {
						o && console.error('unable to copy using execCommand: ', n),
							o && console.warn('trying IE specific stuff');
						try {
							window.clipboardData.setData('text', e), (l = !0);
						} catch (n) {
							o && console.error('unable to copy using clipboardData: ', n),
								o && console.error('falling back to prompt'),
								(r = format('message' in t ? t.message : defaultMessage)),
								window.prompt(r, e);
						}
					} finally {
						s && ('function' === typeof s.removeRange ? s.removeRange(c) : s.removeAllRanges()),
							a && document.body.removeChild(a),
							n();
					}
					return l;
				}
				var deselectCurrent = require('toggle-selection'),
					defaultMessage = 'Copy to clipboard: #{key}, Enter';
				module.exports = copy;
			},
			{ 'toggle-selection': 12 }
		],
		5: [
			function(require, module, exports) {
				function identity(t) {
					return (
						(t[0] = 1),
						(t[1] = 0),
						(t[2] = 0),
						(t[3] = 0),
						(t[4] = 0),
						(t[5] = 1),
						(t[6] = 0),
						(t[7] = 0),
						(t[8] = 0),
						(t[9] = 0),
						(t[10] = 1),
						(t[11] = 0),
						(t[12] = 0),
						(t[13] = 0),
						(t[14] = 0),
						(t[15] = 1),
						t
					);
				}
				module.exports = identity;
			},
			{}
		],
		6: [
			function(require, module, exports) {
				function invert(n, r) {
					let e = r[0],
						t = r[1],
						u = r[2],
						i = r[3],
						l = r[4],
						o = r[5],
						v = r[6],
						a = r[7],
						c = r[8],
						d = r[9],
						f = r[10],
						m = r[11],
						p = r[12],
						s = r[13],
						x = r[14],
						b = r[15],
						g = e * o - t * l,
						h = e * v - u * l,
						j = e * a - i * l,
						k = t * v - u * o,
						q = t * a - i * o,
						w = u * a - i * v,
						y = c * s - d * p,
						z = c * x - f * p,
						A = c * b - m * p,
						B = d * x - f * s,
						C = d * b - m * s,
						D = f * b - m * x,
						E = g * D - h * C + j * B + k * A - q * z + w * y;
					return E
						? ((E = 1 / E),
						  (n[0] = (o * D - v * C + a * B) * E),
						  (n[1] = (u * C - t * D - i * B) * E),
						  (n[2] = (s * w - x * q + b * k) * E),
						  (n[3] = (f * q - d * w - m * k) * E),
						  (n[4] = (v * A - l * D - a * z) * E),
						  (n[5] = (e * D - u * A + i * z) * E),
						  (n[6] = (x * j - p * w - b * h) * E),
						  (n[7] = (c * w - f * j + m * h) * E),
						  (n[8] = (l * C - o * A + a * y) * E),
						  (n[9] = (t * A - e * C - i * y) * E),
						  (n[10] = (p * q - s * j + b * g) * E),
						  (n[11] = (d * j - c * q - m * g) * E),
						  (n[12] = (o * z - l * B - v * y) * E),
						  (n[13] = (e * B - t * z + u * y) * E),
						  (n[14] = (s * h - p * k - x * g) * E),
						  (n[15] = (c * k - d * h + f * g) * E),
						  n)
						: null;
				}
				module.exports = invert;
			},
			{}
		],
		7: [
			function(require, module, exports) {
				function lookAt(t, a, e, r) {
					let i,
						o,
						s,
						h,
						n,
						M,
						d,
						q,
						u,
						b,
						l = a[0],
						y = a[1],
						k = a[2],
						v = r[0],
						A = r[1],
						c = r[2],
						f = e[0],
						m = e[1],
						p = e[2];
					return Math.abs(l - f) < 1e-6 && Math.abs(y - m) < 1e-6 && Math.abs(k - p) < 1e-6
						? identity(t)
						: ((d = l - f),
						  (q = y - m),
						  (u = k - p),
						  (b = 1 / Math.sqrt(d * d + q * q + u * u)),
						  (d *= b),
						  (q *= b),
						  (u *= b),
						  (i = A * u - c * q),
						  (o = c * d - v * u),
						  (s = v * q - A * d),
						  (b = Math.sqrt(i * i + o * o + s * s)),
						  b ? ((b = 1 / b), (i *= b), (o *= b), (s *= b)) : ((i = 0), (o = 0), (s = 0)),
						  (h = q * s - u * o),
						  (n = u * i - d * s),
						  (M = d * o - q * i),
						  (b = Math.sqrt(h * h + n * n + M * M)),
						  b ? ((b = 1 / b), (h *= b), (n *= b), (M *= b)) : ((h = 0), (n = 0), (M = 0)),
						  (t[0] = i),
						  (t[1] = h),
						  (t[2] = d),
						  (t[3] = 0),
						  (t[4] = o),
						  (t[5] = n),
						  (t[6] = q),
						  (t[7] = 0),
						  (t[8] = s),
						  (t[9] = M),
						  (t[10] = u),
						  (t[11] = 0),
						  (t[12] = -(i * l + o * y + s * k)),
						  (t[13] = -(h * l + n * y + M * k)),
						  (t[14] = -(d * l + q * y + u * k)),
						  (t[15] = 1),
						  t);
				}
				var identity = require('./identity');
				module.exports = lookAt;
			},
			{ './identity': 5 }
		],
		8: [
			function(require, module, exports) {
				function multiply(l, t, u) {
					let r = t[0],
						e = t[1],
						i = t[2],
						m = t[3],
						n = t[4],
						o = t[5],
						p = t[6],
						y = t[7],
						a = t[8],
						c = t[9],
						d = t[10],
						f = t[11],
						s = t[12],
						v = t[13],
						x = t[14],
						b = t[15],
						g = u[0],
						h = u[1],
						j = u[2],
						k = u[3];
					return (
						(l[0] = g * r + h * n + j * a + k * s),
						(l[1] = g * e + h * o + j * c + k * v),
						(l[2] = g * i + h * p + j * d + k * x),
						(l[3] = g * m + h * y + j * f + k * b),
						(g = u[4]),
						(h = u[5]),
						(j = u[6]),
						(k = u[7]),
						(l[4] = g * r + h * n + j * a + k * s),
						(l[5] = g * e + h * o + j * c + k * v),
						(l[6] = g * i + h * p + j * d + k * x),
						(l[7] = g * m + h * y + j * f + k * b),
						(g = u[8]),
						(h = u[9]),
						(j = u[10]),
						(k = u[11]),
						(l[8] = g * r + h * n + j * a + k * s),
						(l[9] = g * e + h * o + j * c + k * v),
						(l[10] = g * i + h * p + j * d + k * x),
						(l[11] = g * m + h * y + j * f + k * b),
						(g = u[12]),
						(h = u[13]),
						(j = u[14]),
						(k = u[15]),
						(l[12] = g * r + h * n + j * a + k * s),
						(l[13] = g * e + h * o + j * c + k * v),
						(l[14] = g * i + h * p + j * d + k * x),
						(l[15] = g * m + h * y + j * f + k * b),
						l
					);
				}
				module.exports = multiply;
			},
			{}
		],
		9: [
			function(require, module, exports) {
				function perspective(e, t, r, p, n) {
					let a = 1 / Math.tan(t / 2),
						c = 1 / (p - n);
					return (
						(e[0] = a / r),
						(e[1] = 0),
						(e[2] = 0),
						(e[3] = 0),
						(e[4] = 0),
						(e[5] = a),
						(e[6] = 0),
						(e[7] = 0),
						(e[8] = 0),
						(e[9] = 0),
						(e[10] = (n + p) * c),
						(e[11] = -1),
						(e[12] = 0),
						(e[13] = 0),
						(e[14] = 2 * n * p * c),
						(e[15] = 0),
						e
					);
				}
				module.exports = perspective;
			},
			{}
		],
		10: [
			function(require, module, exports) {
				function rotate(t, a, r, e) {
					let o,
						n,
						s,
						h,
						u,
						M,
						l,
						c,
						i,
						b,
						d,
						f,
						m,
						p,
						q,
						v,
						x,
						g,
						j,
						k,
						w,
						y,
						z,
						A,
						B = e[0],
						C = e[1],
						D = e[2],
						E = Math.sqrt(B * B + C * C + D * D);
					return Math.abs(E) < 1e-6
						? null
						: ((E = 1 / E),
						  (B *= E),
						  (C *= E),
						  (D *= E),
						  (o = Math.sin(r)),
						  (n = Math.cos(r)),
						  (s = 1 - n),
						  (h = a[0]),
						  (u = a[1]),
						  (M = a[2]),
						  (l = a[3]),
						  (c = a[4]),
						  (i = a[5]),
						  (b = a[6]),
						  (d = a[7]),
						  (f = a[8]),
						  (m = a[9]),
						  (p = a[10]),
						  (q = a[11]),
						  (v = B * B * s + n),
						  (x = C * B * s + D * o),
						  (g = D * B * s - C * o),
						  (j = B * C * s - D * o),
						  (k = C * C * s + n),
						  (w = D * C * s + B * o),
						  (y = B * D * s + C * o),
						  (z = C * D * s - B * o),
						  (A = D * D * s + n),
						  (t[0] = h * v + c * x + f * g),
						  (t[1] = u * v + i * x + m * g),
						  (t[2] = M * v + b * x + p * g),
						  (t[3] = l * v + d * x + q * g),
						  (t[4] = h * j + c * k + f * w),
						  (t[5] = u * j + i * k + m * w),
						  (t[6] = M * j + b * k + p * w),
						  (t[7] = l * j + d * k + q * w),
						  (t[8] = h * y + c * z + f * A),
						  (t[9] = u * y + i * z + m * A),
						  (t[10] = M * y + b * z + p * A),
						  (t[11] = l * y + d * z + q * A),
						  a !== t && ((t[12] = a[12]), (t[13] = a[13]), (t[14] = a[14]), (t[15] = a[15])),
						  t);
				}
				module.exports = rotate;
			},
			{}
		],
		11: [
			function(require, module, exports) {
				function transformMat4(r, t, a) {
					let n = t[0],
						o = t[1],
						e = t[2],
						f = a[3] * n + a[7] * o + a[11] * e + a[15];
					return (
						(f = f || 1),
						(r[0] = (a[0] * n + a[4] * o + a[8] * e + a[12]) / f),
						(r[1] = (a[1] * n + a[5] * o + a[9] * e + a[13]) / f),
						(r[2] = (a[2] * n + a[6] * o + a[10] * e + a[14]) / f),
						r
					);
				}
				module.exports = transformMat4;
			},
			{}
		],
		12: [
			function(require, module, exports) {
				module.exports = function() {
					const e = document.getSelection();
					if (!e.rangeCount) return function() {};
					for (var n = document.activeElement, t = [], a = 0; a < e.rangeCount; a++) t.push(e.getRangeAt(a));
					switch (n.tagName.toUpperCase()) {
						case 'INPUT':
						case 'TEXTAREA':
							n.blur();
							break;
						default:
							n = null;
					}
					return (
						e.removeAllRanges(),
						function() {
							'Caret' === e.type && e.removeAllRanges(),
								e.rangeCount ||
									t.forEach((n) => {
										e.addRange(n);
									}),
								n && n.focus();
						}
					);
				};
			},
			{}
		]
	},
	{},
	[1]
);
