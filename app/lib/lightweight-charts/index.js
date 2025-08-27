/* eslint-disable object-shorthand */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-var */
/*!
 * @license
 * TradingView Lightweight Charts™ v5.0.8
 * Copyright (c) 2025 TradingView, Inc.
 * Licensed under Apache License 2.0 https://www.apache.org/licenses/LICENSE-2.0
 */
!(function () {
  'use strict';
  const t = {
    title: '',
    visible: !0,
    lastValueVisible: !0,
    priceLineVisible: !0,
    priceLineSource: 0,
    priceLineWidth: 1,
    priceLineColor: '',
    priceLineStyle: 2,
    baseLineVisible: !0,
    baseLineWidth: 1,
    baseLineColor: '#B2B5BE',
    baseLineStyle: 0,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
  };
  var i, s;
  function n(t, i) {
    const s = {
      0: [],
      1: [t.lineWidth, t.lineWidth],
      2: [2 * t.lineWidth, 2 * t.lineWidth],
      3: [6 * t.lineWidth, 6 * t.lineWidth],
      4: [t.lineWidth, 4 * t.lineWidth],
    }[i];
    t.setLineDash(s);
  }
  function e(t, i, s, n) {
    t.beginPath();
    const e = t.lineWidth % 2 ? 0.5 : 0;
    t.moveTo(s, i + e), t.lineTo(n, i + e), t.stroke();
  }
  function r(t, i) {
    if (!t) throw new Error('Assertion failed' + (i ? ': ' + i : ''));
  }
  function h(t) {
    if (void 0 === t) throw new Error('Value is undefined');
    return t;
  }
  function a(t) {
    if (null === t) throw new Error('Value is null');
    return t;
  }
  function l(t) {
    return a(h(t));
  }
  !(function (t) {
    (t[(t.Simple = 0)] = 'Simple'),
      (t[(t.WithSteps = 1)] = 'WithSteps'),
      (t[(t.Curved = 2)] = 'Curved');
  })(i || (i = {})),
    (function (t) {
      (t[(t.Solid = 0)] = 'Solid'),
        (t[(t.Dotted = 1)] = 'Dotted'),
        (t[(t.Dashed = 2)] = 'Dashed'),
        (t[(t.LargeDashed = 3)] = 'LargeDashed'),
        (t[(t.SparseDotted = 4)] = 'SparseDotted');
    })(s || (s = {}));
  class o {
    constructor() {
      this.t = [];
    }
    i(t, i, s) {
      const n = { h: t, l: i, o: !0 === s };
      this.t.push(n);
    }
    _(t) {
      const i = this.t.findIndex((i) => t === i.h);
      i > -1 && this.t.splice(i, 1);
    }
    u(t) {
      this.t = this.t.filter((i) => i.l !== t);
    }
    p(t, i, s) {
      const n = [...this.t];
      (this.t = this.t.filter((t) => !t.o)), n.forEach((n) => n.h(t, i, s));
    }
    v() {
      return this.t.length > 0;
    }
    m() {
      this.t = [];
    }
  }
  function _(t, ...i) {
    for (const s of i)
      for (const i in s)
        void 0 !== s[i] &&
          Object.prototype.hasOwnProperty.call(s, i) &&
          !['__proto__', 'constructor', 'prototype'].includes(i) &&
          ('object' != typeof s[i] || void 0 === t[i] || Array.isArray(s[i])
            ? (t[i] = s[i])
            : _(t[i], s[i]));
    return t;
  }
  function u(t) {
    return 'number' == typeof t && isFinite(t);
  }
  function c(t) {
    return 'number' == typeof t && t % 1 == 0;
  }
  function d(t) {
    return 'string' == typeof t;
  }
  function f(t) {
    return 'boolean' == typeof t;
  }
  function p(t) {
    const i = t;
    if (!i || 'object' != typeof i) return i;
    let s, n, e;
    for (n in ((s = Array.isArray(i) ? [] : {}), i))
      i.hasOwnProperty(n) &&
        ((e = i[n]), (s[n] = e && 'object' == typeof e ? p(e) : e));
    return s;
  }
  function v(t) {
    return null !== t;
  }
  function m(t) {
    return null === t ? void 0 : t;
  }
  const w =
    "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
  function g(t, i, s) {
    return (
      void 0 === i && (i = w), `${(s = void 0 !== s ? `${s} ` : '')}${t}px ${i}`
    );
  }
  class M {
    constructor(t) {
      (this.M = {
        S: 1,
        C: 5,
        P: NaN,
        k: '',
        T: '',
        R: '',
        D: '',
        V: 0,
        B: 0,
        I: 0,
        A: 0,
        O: 0,
      }),
        (this.L = t);
    }
    N() {
      const t = this.M,
        i = this.W(),
        s = this.F();
      return (
        (t.P === i && t.T === s) ||
          ((t.P = i),
          (t.T = s),
          (t.k = g(i, s)),
          (t.A = (2.5 / 12) * i),
          (t.V = t.A),
          (t.B = (i / 12) * t.C),
          (t.I = (i / 12) * t.C),
          (t.O = 0)),
        (t.R = this.H()),
        (t.D = this.U()),
        this.M
      );
    }
    H() {
      return this.L.N().layout.textColor;
    }
    U() {
      return this.L.$();
    }
    W() {
      return this.L.N().layout.fontSize;
    }
    F() {
      return this.L.N().layout.fontFamily;
    }
  }
  function b(t) {
    return t < 0 ? 0 : t > 255 ? 255 : Math.round(t) || 0;
  }
  function x(t) {
    return 0.199 * t[0] + 0.687 * t[1] + 0.114 * t[2];
  }
  class S {
    constructor(t, i) {
      (this.j = new Map()), (this.q = t), i && (this.j = i);
    }
    Y(t, i) {
      if ('transparent' === t) return t;
      const s = this.K(t),
        n = s[3];
      return `rgba(${s[0]}, ${s[1]}, ${s[2]}, ${i * n})`;
    }
    X(t) {
      const i = this.K(t);
      return {
        Z: `rgb(${i[0]}, ${i[1]}, ${i[2]})`,
        G: x(i) > 160 ? 'black' : 'white',
      };
    }
    J(t) {
      return x(this.K(t));
    }
    tt(t, i, s) {
      const [n, e, r, h] = this.K(t),
        [a, l, o, _] = this.K(i),
        u = [
          b(n + s * (a - n)),
          b(e + s * (l - e)),
          b(r + s * (o - r)),
          ((c = h + s * (_ - h)),
          c <= 0 || c > 1
            ? Math.min(Math.max(c, 0), 1)
            : Math.round(1e4 * c) / 1e4),
        ];
      var c;
      return `rgba(${u[0]}, ${u[1]}, ${u[2]}, ${u[3]})`;
    }
    K(t) {
      const i = this.j.get(t);
      if (i) return i;
      const s = (function (t) {
          const i = document.createElement('div');
          (i.style.display = 'none'),
            document.body.appendChild(i),
            (i.style.color = t);
          const s = window.getComputedStyle(i).color;
          return document.body.removeChild(i), s;
        })(t),
        n = s.match(
          /^rgba?\s*\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)$/,
        );
      if (!n) {
        if (this.q.length)
          for (const i of this.q) {
            const s = i(t);
            if (s) return this.j.set(t, s), s;
          }
        throw new Error(`Failed to parse color: ${t}`);
      }
      const e = [
        parseInt(n[1], 10),
        parseInt(n[2], 10),
        parseInt(n[3], 10),
        n[4] ? parseFloat(n[4]) : 1,
      ];
      return this.j.set(t, e), e;
    }
  }
  class C {
    constructor() {
      this.it = [];
    }
    st(t) {
      this.it = t;
    }
    nt(t, i, s) {
      this.it.forEach((n) => {
        n.nt(t, i, s);
      });
    }
  }
  class P {
    nt(t, i, s) {
      t.useBitmapCoordinateSpace((t) => this.et(t, i, s));
    }
  }
  class y extends P {
    constructor() {
      super(...arguments), (this.rt = null);
    }
    ht(t) {
      this.rt = t;
    }
    et({ context: t, horizontalPixelRatio: i, verticalPixelRatio: s }) {
      if (null === this.rt || null === this.rt.lt) return;
      const n = this.rt.lt,
        e = this.rt,
        r = (Math.max(1, Math.floor(i)) % 2) / 2,
        h = (h) => {
          t.beginPath();
          for (let a = n.to - 1; a >= n.from; --a) {
            const n = e.ot[a],
              l = Math.round(n._t * i) + r,
              o = n.ut * s,
              _ = h * s + r;
            t.moveTo(l, o), t.arc(l, o, _, 0, 2 * Math.PI);
          }
          t.fill();
        };
      e.ct > 0 && ((t.fillStyle = e.dt), h(e.ft + e.ct)),
        (t.fillStyle = e.vt),
        h(e.ft);
    }
  }
  function k() {
    return {
      ot: [{ _t: 0, ut: 0, wt: 0, gt: 0 }],
      vt: '',
      dt: '',
      ft: 0,
      ct: 0,
      lt: null,
    };
  }
  const T = { from: 0, to: 1 };
  class R {
    constructor(t, i, s) {
      (this.Mt = new C()),
        (this.bt = []),
        (this.xt = []),
        (this.St = !0),
        (this.L = t),
        (this.Ct = i),
        (this.Pt = s),
        this.Mt.st(this.bt);
    }
    yt(t) {
      this.kt(), (this.St = !0);
    }
    Tt() {
      return this.St && (this.Rt(), (this.St = !1)), this.Mt;
    }
    kt() {
      const t = this.Pt.Dt();
      t.length !== this.bt.length &&
        ((this.xt = t.map(k)),
        (this.bt = this.xt.map((t) => {
          const i = new y();
          return i.ht(t), i;
        })),
        this.Mt.st(this.bt));
    }
    Rt() {
      const t = 2 === this.Ct.N().mode || !this.Ct.Et(),
        i = this.Pt.Vt(),
        s = this.Ct.Bt(),
        n = this.L.It();
      this.kt(),
        i.forEach((i, e) => {
          const r = this.xt[e],
            h = i.At(s),
            a = i.zt();
          !t && null !== h && i.Et() && null !== a
            ? ((r.vt = h.Ot),
              (r.ft = h.ft),
              (r.ct = h.Lt),
              (r.ot[0].gt = h.gt),
              (r.ot[0].ut = i.Wt().Nt(h.gt, a.Ft)),
              (r.dt = h.Ht ?? this.L.Ut(r.ot[0].ut / i.Wt().$t())),
              (r.ot[0].wt = s),
              (r.ot[0]._t = n.jt(s)),
              (r.lt = T))
            : (r.lt = null);
        });
    }
  }
  class D extends P {
    constructor(t) {
      super(), (this.qt = t);
    }
    et({
      context: t,
      bitmapSize: i,
      horizontalPixelRatio: s,
      verticalPixelRatio: r,
    }) {
      if (null === this.qt) return;
      const h = this.qt.Yt.Et,
        a = this.qt.Kt.Et;
      if (!h && !a) return;
      const l = Math.round(this.qt._t * s),
        o = Math.round(this.qt.ut * r);
      (t.lineCap = 'butt'),
        h &&
          l >= 0 &&
          ((t.lineWidth = Math.floor(this.qt.Yt.ct * s)),
          (t.strokeStyle = this.qt.Yt.R),
          (t.fillStyle = this.qt.Yt.R),
          n(t, this.qt.Yt.Xt),
          (function (t, i, s, n) {
            t.beginPath();
            const e = t.lineWidth % 2 ? 0.5 : 0;
            t.moveTo(i + e, s), t.lineTo(i + e, n), t.stroke();
          })(t, l, 0, i.height)),
        a &&
          o >= 0 &&
          ((t.lineWidth = Math.floor(this.qt.Kt.ct * r)),
          (t.strokeStyle = this.qt.Kt.R),
          (t.fillStyle = this.qt.Kt.R),
          n(t, this.qt.Kt.Xt),
          e(t, o, 0, i.width));
    }
  }
  class E {
    constructor(t, i) {
      (this.St = !0),
        (this.Zt = {
          Yt: { ct: 1, Xt: 0, R: '', Et: !1 },
          Kt: { ct: 1, Xt: 0, R: '', Et: !1 },
          _t: 0,
          ut: 0,
        }),
        (this.Gt = new D(this.Zt)),
        (this.Jt = t),
        (this.Pt = i);
    }
    yt() {
      this.St = !0;
    }
    Tt(t) {
      return this.St && (this.Rt(), (this.St = !1)), this.Gt;
    }
    Rt() {
      const t = this.Jt.Et(),
        i = this.Pt.Qt().N().crosshair,
        s = this.Zt;
      if (2 === i.mode) return (s.Kt.Et = !1), void (s.Yt.Et = !1);
      (s.Kt.Et = t && this.Jt.ti(this.Pt)),
        (s.Yt.Et = t && this.Jt.ii()),
        (s.Kt.ct = i.horzLine.width),
        (s.Kt.Xt = i.horzLine.style),
        (s.Kt.R = i.horzLine.color),
        (s.Yt.ct = i.vertLine.width),
        (s.Yt.Xt = i.vertLine.style),
        (s.Yt.R = i.vertLine.color),
        (s._t = this.Jt.si()),
        (s.ut = this.Jt.ni());
    }
  }
  function V(t, i, s, n, e, r) {
    t.fillRect(i + r, s, n - 2 * r, r),
      t.fillRect(i + r, s + e - r, n - 2 * r, r),
      t.fillRect(i, s, r, e),
      t.fillRect(i + n - r, s, r, e);
  }
  function B(t, i, s, n, e, r) {
    t.save(),
      (t.globalCompositeOperation = 'copy'),
      (t.fillStyle = r),
      t.fillRect(i, s, n, e),
      t.restore();
  }
  function I(t, i, s, n, e, r) {
    t.beginPath(),
      t.roundRect
        ? t.roundRect(i, s, n, e, r)
        : (t.lineTo(i + n - r[1], s),
          0 !== r[1] && t.arcTo(i + n, s, i + n, s + r[1], r[1]),
          t.lineTo(i + n, s + e - r[2]),
          0 !== r[2] && t.arcTo(i + n, s + e, i + n - r[2], s + e, r[2]),
          t.lineTo(i + r[3], s + e),
          0 !== r[3] && t.arcTo(i, s + e, i, s + e - r[3], r[3]),
          t.lineTo(i, s + r[0]),
          0 !== r[0] && t.arcTo(i, s, i + r[0], s, r[0]));
  }
  function A(t, i, s, n, e, r, h = 0, a = [0, 0, 0, 0], l = '') {
    if ((t.save(), !h || !l || l === r))
      return I(t, i, s, n, e, a), (t.fillStyle = r), t.fill(), void t.restore();
    const o = h / 2;
    var _;
    I(
      t,
      i + o,
      s + o,
      n - h,
      e - h,
      ((_ = -o), a.map((t) => (0 === t ? t : t + _))),
    ),
      'transparent' !== r && ((t.fillStyle = r), t.fill()),
      'transparent' !== l &&
        ((t.lineWidth = h), (t.strokeStyle = l), t.closePath(), t.stroke()),
      t.restore();
  }
  function z(t, i, s, n, e, r, h) {
    t.save(), (t.globalCompositeOperation = 'copy');
    const a = t.createLinearGradient(0, 0, 0, e);
    a.addColorStop(0, r),
      a.addColorStop(1, h),
      (t.fillStyle = a),
      t.fillRect(i, s, n, e),
      t.restore();
  }
  class O {
    constructor(t, i) {
      this.ht(t, i);
    }
    ht(t, i) {
      (this.qt = t), (this.ei = i);
    }
    $t(t, i) {
      return this.qt.Et ? t.P + t.A + t.V : 0;
    }
    nt(t, i, s, n) {
      if (!this.qt.Et || 0 === this.qt.ri.length) return;
      const e = this.qt.R,
        r = this.ei.Z,
        h = t.useBitmapCoordinateSpace((t) => {
          const h = t.context;
          h.font = i.k;
          const a = this.hi(t, i, s, n),
            l = a.ai;
          return (
            a.li
              ? A(h, l.oi, l._i, l.ui, l.ci, r, l.di, [l.ft, 0, 0, l.ft], r)
              : A(h, l.fi, l._i, l.ui, l.ci, r, l.di, [0, l.ft, l.ft, 0], r),
            this.qt.pi &&
              ((h.fillStyle = e), h.fillRect(l.fi, l.mi, l.wi - l.fi, l.gi)),
            this.qt.Mi &&
              ((h.fillStyle = i.D),
              h.fillRect(a.li ? l.bi - l.di : 0, l._i, l.di, l.xi - l._i)),
            a
          );
        });
      t.useMediaCoordinateSpace(({ context: t }) => {
        const s = h.Si;
        (t.font = i.k),
          (t.textAlign = h.li ? 'right' : 'left'),
          (t.textBaseline = 'middle'),
          (t.fillStyle = e),
          t.fillText(this.qt.ri, s.Ci, (s._i + s.xi) / 2 + s.Pi);
      });
    }
    hi(t, i, s, n) {
      const {
          context: e,
          bitmapSize: r,
          mediaSize: h,
          horizontalPixelRatio: a,
          verticalPixelRatio: l,
        } = t,
        o = this.qt.pi || !this.qt.yi ? i.C : 0,
        _ = this.qt.ki ? i.S : 0,
        u = i.A + this.ei.Ti,
        c = i.V + this.ei.Ri,
        d = i.B,
        f = i.I,
        p = this.qt.ri,
        v = i.P,
        m = s.Di(e, p),
        w = Math.ceil(s.Ei(e, p)),
        g = v + u + c,
        M = i.S + d + f + w + o,
        b = Math.max(1, Math.floor(l));
      let x = Math.round(g * l);
      x % 2 != b % 2 && (x += 1);
      const S = _ > 0 ? Math.max(1, Math.floor(_ * a)) : 0,
        C = Math.round(M * a),
        P = Math.round(o * a),
        y = this.ei.Vi ?? this.ei.Bi,
        k = Math.round(y * l) - Math.floor(0.5 * l),
        T = Math.floor(k + b / 2 - x / 2),
        R = T + x,
        D = 'right' === n,
        E = D ? h.width - _ : _,
        V = D ? r.width - S : S;
      let B, I, A;
      return (
        D
          ? ((B = V - C), (I = V - P), (A = E - o - d - _))
          : ((B = V + C), (I = V + P), (A = E + o + d)),
        {
          li: D,
          ai: {
            _i: T,
            mi: k,
            xi: R,
            ui: C,
            ci: x,
            ft: 2 * a,
            di: S,
            oi: B,
            fi: V,
            wi: I,
            gi: b,
            bi: r.width,
          },
          Si: { _i: T / l, xi: R / l, Ci: A, Pi: m },
        }
      );
    }
  }
  class L {
    constructor(t) {
      (this.Ii = { Bi: 0, Z: '#000', Ri: 0, Ti: 0 }),
        (this.Ai = {
          ri: '',
          Et: !1,
          pi: !0,
          yi: !1,
          Ht: '',
          R: '#FFF',
          Mi: !1,
          ki: !1,
        }),
        (this.zi = {
          ri: '',
          Et: !1,
          pi: !1,
          yi: !0,
          Ht: '',
          R: '#FFF',
          Mi: !0,
          ki: !0,
        }),
        (this.St = !0),
        (this.Oi = new (t || O)(this.Ai, this.Ii)),
        (this.Li = new (t || O)(this.zi, this.Ii));
    }
    ri() {
      return this.Ni(), this.Ai.ri;
    }
    Bi() {
      return this.Ni(), this.Ii.Bi;
    }
    yt() {
      this.St = !0;
    }
    $t(t, i = !1) {
      return Math.max(this.Oi.$t(t, i), this.Li.$t(t, i));
    }
    Wi() {
      return this.Ii.Vi || 0;
    }
    Fi(t) {
      this.Ii.Vi = t;
    }
    Hi() {
      return this.Ni(), this.Ai.Et || this.zi.Et;
    }
    Ui() {
      return this.Ni(), this.Ai.Et;
    }
    Tt(t) {
      return (
        this.Ni(),
        (this.Ai.pi = this.Ai.pi && t.N().ticksVisible),
        (this.zi.pi = this.zi.pi && t.N().ticksVisible),
        this.Oi.ht(this.Ai, this.Ii),
        this.Li.ht(this.zi, this.Ii),
        this.Oi
      );
    }
    $i() {
      return (
        this.Ni(),
        this.Oi.ht(this.Ai, this.Ii),
        this.Li.ht(this.zi, this.Ii),
        this.Li
      );
    }
    Ni() {
      this.St &&
        ((this.Ai.pi = !0),
        (this.zi.pi = !1),
        this.ji(this.Ai, this.zi, this.Ii));
    }
  }
  class N extends L {
    constructor(t, i, s) {
      super(), (this.Jt = t), (this.qi = i), (this.Yi = s);
    }
    ji(t, i, s) {
      if (((t.Et = !1), 2 === this.Jt.N().mode)) return;
      const n = this.Jt.N().horzLine;
      if (!n.labelVisible) return;
      const e = this.qi.zt();
      if (!this.Jt.Et() || this.qi.Ki() || null === e) return;
      const r = this.qi.Xi().X(n.labelBackgroundColor);
      (s.Z = r.Z), (t.R = r.G);
      const h = (2 / 12) * this.qi.P();
      (s.Ti = h), (s.Ri = h);
      const a = this.Yi(this.qi);
      (s.Bi = a.Bi), (t.ri = this.qi.Zi(a.gt, e)), (t.Et = !0);
    }
  }
  const W = /[1-9]/g;
  class F {
    constructor() {
      this.qt = null;
    }
    ht(t) {
      this.qt = t;
    }
    nt(t, i) {
      if (null === this.qt || !1 === this.qt.Et || 0 === this.qt.ri.length)
        return;
      const s = t.useMediaCoordinateSpace(
        ({ context: t }) => (
          (t.font = i.k), Math.round(i.Gi.Ei(t, a(this.qt).ri, W))
        ),
      );
      if (s <= 0) return;
      const n = i.Ji,
        e = s + 2 * n,
        r = e / 2,
        h = this.qt.Qi;
      let l = this.qt.Bi,
        o = Math.floor(l - r) + 0.5;
      o < 0
        ? ((l += Math.abs(0 - o)), (o = Math.floor(l - r) + 0.5))
        : o + e > h &&
          ((l -= Math.abs(h - (o + e))), (o = Math.floor(l - r) + 0.5));
      const _ = o + e,
        u = Math.ceil(0 + i.S + i.C + i.A + i.P + i.V);
      t.useBitmapCoordinateSpace(
        ({ context: t, horizontalPixelRatio: s, verticalPixelRatio: n }) => {
          const e = a(this.qt);
          t.fillStyle = e.Z;
          const r = Math.round(o * s),
            h = Math.round(0 * n),
            l = Math.round(_ * s),
            c = Math.round(u * n),
            d = Math.round(2 * s);
          if (
            (t.beginPath(),
            t.moveTo(r, h),
            t.lineTo(r, c - d),
            t.arcTo(r, c, r + d, c, d),
            t.lineTo(l - d, c),
            t.arcTo(l, c, l, c - d, d),
            t.lineTo(l, h),
            t.fill(),
            e.pi)
          ) {
            const r = Math.round(e.Bi * s),
              a = h,
              l = Math.round((a + i.C) * n);
            t.fillStyle = e.R;
            const o = Math.max(1, Math.floor(s)),
              _ = Math.floor(0.5 * s);
            t.fillRect(r - _, a, o, l - a);
          }
        },
      ),
        t.useMediaCoordinateSpace(({ context: t }) => {
          const s = a(this.qt),
            e = 0 + i.S + i.C + i.A + i.P / 2;
          (t.font = i.k),
            (t.textAlign = 'left'),
            (t.textBaseline = 'middle'),
            (t.fillStyle = s.R);
          const r = i.Gi.Di(t, 'Apr0');
          t.translate(o + n, e + r), t.fillText(s.ri, 0, 0);
        });
    }
  }
  class H {
    constructor(t, i, s) {
      (this.St = !0),
        (this.Gt = new F()),
        (this.Zt = {
          Et: !1,
          Z: '#4c525e',
          R: 'white',
          ri: '',
          Qi: 0,
          Bi: NaN,
          pi: !0,
        }),
        (this.Ct = t),
        (this.ts = i),
        (this.Yi = s);
    }
    yt() {
      this.St = !0;
    }
    Tt() {
      return (
        this.St && (this.Rt(), (this.St = !1)), this.Gt.ht(this.Zt), this.Gt
      );
    }
    Rt() {
      const t = this.Zt;
      if (((t.Et = !1), 2 === this.Ct.N().mode)) return;
      const i = this.Ct.N().vertLine;
      if (!i.labelVisible) return;
      const s = this.ts.It();
      if (s.Ki()) return;
      t.Qi = s.Qi();
      const n = this.Yi();
      if (null === n) return;
      t.Bi = n.Bi;
      const e = s.ss(this.Ct.Bt());
      (t.ri = s.ns(a(e))), (t.Et = !0);
      const r = this.ts.Xi().X(i.labelBackgroundColor);
      (t.Z = r.Z), (t.R = r.G), (t.pi = s.N().ticksVisible);
    }
  }
  class U {
    constructor() {
      (this.es = null), (this.rs = 0);
    }
    hs() {
      return this.rs;
    }
    ls(t) {
      this.rs = t;
    }
    Wt() {
      return this.es;
    }
    _s(t) {
      this.es = t;
    }
    us(t) {
      return [];
    }
    cs() {
      return [];
    }
    Et() {
      return !0;
    }
  }
  var $;
  !(function (t) {
    (t[(t.Normal = 0)] = 'Normal'),
      (t[(t.Magnet = 1)] = 'Magnet'),
      (t[(t.Hidden = 2)] = 'Hidden'),
      (t[(t.MagnetOHLC = 3)] = 'MagnetOHLC');
  })($ || ($ = {}));
  class j extends U {
    constructor(t, i) {
      super(),
        (this.Pt = null),
        (this.ds = NaN),
        (this.fs = 0),
        (this.ps = !1),
        (this.vs = new Map()),
        (this.ws = !1),
        (this.gs = new WeakMap()),
        (this.Ms = new WeakMap()),
        (this.bs = NaN),
        (this.xs = NaN),
        (this.Ss = NaN),
        (this.Cs = NaN),
        (this.ts = t),
        (this.Ps = i);
      this.ys = ((t, i) => (s) => {
        const n = i(),
          e = t();
        if (s === a(this.Pt).ks()) return { gt: e, Bi: n };
        {
          const t = a(s.zt());
          return { gt: s.Ts(n, t), Bi: n };
        }
      })(
        () => this.ds,
        () => this.xs,
      );
      const s = ((t, i) => () => {
        const s = this.ts.It().Rs(t()),
          n = i();
        return s && Number.isFinite(n) ? { wt: s, Bi: n } : null;
      })(
        () => this.fs,
        () => this.si(),
      );
      this.Ds = new H(this, t, s);
    }
    N() {
      return this.Ps;
    }
    Es(t, i) {
      (this.Ss = t), (this.Cs = i);
    }
    Vs() {
      (this.Ss = NaN), (this.Cs = NaN);
    }
    Bs() {
      return this.Ss;
    }
    Is() {
      return this.Cs;
    }
    As(t, i, s) {
      this.ws || (this.ws = !0), (this.ps = !0), this.zs(t, i, s);
    }
    Bt() {
      return this.fs;
    }
    si() {
      return this.bs;
    }
    ni() {
      return this.xs;
    }
    Et() {
      return this.ps;
    }
    Os() {
      (this.ps = !1),
        this.Ls(),
        (this.ds = NaN),
        (this.bs = NaN),
        (this.xs = NaN),
        (this.Pt = null),
        this.Vs(),
        this.Ns();
    }
    Ws(t) {
      let i = this.gs.get(t);
      i || ((i = new E(this, t)), this.gs.set(t, i));
      let s = this.Ms.get(t);
      return s || ((s = new R(this.ts, this, t)), this.Ms.set(t, s)), [i, s];
    }
    ti(t) {
      return t === this.Pt && this.Ps.horzLine.visible;
    }
    ii() {
      return this.Ps.vertLine.visible;
    }
    Fs(t, i) {
      (this.ps && this.Pt === t) || this.vs.clear();
      const s = [];
      return this.Pt === t && s.push(this.Hs(this.vs, i, this.ys)), s;
    }
    cs() {
      return this.ps ? [this.Ds] : [];
    }
    Us() {
      return this.Pt;
    }
    Ns() {
      this.ts.$s().forEach((t) => {
        this.gs.get(t)?.yt(), this.Ms.get(t)?.yt();
      }),
        this.vs.forEach((t) => t.yt()),
        this.Ds.yt();
    }
    js(t) {
      return t && !t.ks().Ki() ? t.ks() : null;
    }
    zs(t, i, s) {
      this.qs(t, i, s) && this.Ns();
    }
    qs(t, i, s) {
      const n = this.bs,
        e = this.xs,
        r = this.ds,
        h = this.fs,
        a = this.Pt,
        l = this.js(s);
      (this.fs = t),
        (this.bs = isNaN(t) ? NaN : this.ts.It().jt(t)),
        (this.Pt = s);
      const o = null !== l ? l.zt() : null;
      return (
        null !== l && null !== o
          ? ((this.ds = i), (this.xs = l.Nt(i, o)))
          : ((this.ds = NaN), (this.xs = NaN)),
        n !== this.bs ||
          e !== this.xs ||
          h !== this.fs ||
          r !== this.ds ||
          a !== this.Pt
      );
    }
    Ls() {
      const t = this.ts
          .Ys()
          .map((t) => t.Xs().Ks())
          .filter(v),
        i = 0 === t.length ? null : Math.max(...t);
      this.fs = null !== i ? i : NaN;
    }
    Hs(t, i, s) {
      let n = t.get(i);
      return void 0 === n && ((n = new N(this, i, s)), t.set(i, n)), n;
    }
  }
  function q(t) {
    return 'left' === t || 'right' === t;
  }
  class Y {
    constructor(t) {
      (this.Zs = new Map()), (this.Gs = []), (this.Js = t);
    }
    Qs(t, i) {
      const s = (function (t, i) {
        return void 0 === t
          ? i
          : { tn: Math.max(t.tn, i.tn), sn: t.sn || i.sn };
      })(this.Zs.get(t), i);
      this.Zs.set(t, s);
    }
    nn() {
      return this.Js;
    }
    en(t) {
      const i = this.Zs.get(t);
      return void 0 === i
        ? { tn: this.Js }
        : { tn: Math.max(this.Js, i.tn), sn: i.sn };
    }
    rn() {
      this.hn(), (this.Gs = [{ an: 0 }]);
    }
    ln(t) {
      this.hn(), (this.Gs = [{ an: 1, Ft: t }]);
    }
    _n(t) {
      this.un(), this.Gs.push({ an: 5, Ft: t });
    }
    hn() {
      this.un(), this.Gs.push({ an: 6 });
    }
    cn() {
      this.hn(), (this.Gs = [{ an: 4 }]);
    }
    dn(t) {
      this.hn(), this.Gs.push({ an: 2, Ft: t });
    }
    fn(t) {
      this.hn(), this.Gs.push({ an: 3, Ft: t });
    }
    pn() {
      return this.Gs;
    }
    vn(t) {
      for (const i of t.Gs) this.mn(i);
      (this.Js = Math.max(this.Js, t.Js)),
        t.Zs.forEach((t, i) => {
          this.Qs(i, t);
        });
    }
    static wn() {
      return new Y(2);
    }
    static gn() {
      return new Y(3);
    }
    mn(t) {
      switch (t.an) {
        case 0:
          this.rn();
          break;
        case 1:
          this.ln(t.Ft);
          break;
        case 2:
          this.dn(t.Ft);
          break;
        case 3:
          this.fn(t.Ft);
          break;
        case 4:
          this.cn();
          break;
        case 5:
          this._n(t.Ft);
          break;
        case 6:
          this.un();
      }
    }
    un() {
      const t = this.Gs.findIndex((t) => 5 === t.an);
      -1 !== t && this.Gs.splice(t, 1);
    }
  }
  class K {
    formatTickmarks(t) {
      return t.map((t) => this.format(t));
    }
  }
  const X = '.';
  function Z(t, i) {
    if (!u(t)) return 'n/a';
    if (!c(i)) throw new TypeError('invalid length');
    if (i < 0 || i > 16) throw new TypeError('invalid length');
    if (0 === i) return t.toString();
    return ('0000000000000000' + t.toString()).slice(-i);
  }
  class G extends K {
    constructor(t, i) {
      if ((super(), i || (i = 1), (u(t) && c(t)) || (t = 100), t < 0))
        throw new TypeError('invalid base');
      (this.qi = t), (this.Mn = i), this.bn();
    }
    format(t) {
      const i = t < 0 ? '−' : '';
      return (t = Math.abs(t)), i + this.xn(t);
    }
    bn() {
      if (((this.Sn = 0), this.qi > 0 && this.Mn > 0)) {
        let t = this.qi;
        for (; t > 1; ) (t /= 10), this.Sn++;
      }
    }
    xn(t) {
      const i = this.qi / this.Mn;
      let s = Math.floor(t),
        n = '';
      const e = void 0 !== this.Sn ? this.Sn : NaN;
      if (i > 1) {
        let r = +(Math.round(t * i) - s * i).toFixed(this.Sn);
        r >= i && ((r -= i), (s += 1)),
          (n = X + Z(+r.toFixed(this.Sn) * this.Mn, e));
      } else (s = Math.round(s * i) / i), e > 0 && (n = X + Z(0, e));
      return s.toFixed(0) + n;
    }
  }
  class J extends G {
    constructor(t = 100) {
      super(t);
    }
    format(t) {
      return `${super.format(t)}%`;
    }
  }
  class Q extends K {
    constructor(t) {
      super(), (this.Cn = t);
    }
    format(t) {
      let i = '';
      return (
        t < 0 && ((i = '-'), (t = -t)),
        t < 995
          ? i + this.Pn(t)
          : t < 999995
          ? i + this.Pn(t / 1e3) + 'K'
          : t < 999999995
          ? ((t = 1e3 * Math.round(t / 1e3)), i + this.Pn(t / 1e6) + 'M')
          : ((t = 1e6 * Math.round(t / 1e6)), i + this.Pn(t / 1e9) + 'B')
      );
    }
    Pn(t) {
      let i;
      const s = Math.pow(10, this.Cn);
      return (
        (i =
          (t = Math.round(t * s) / s) >= 1e-15 && t < 1
            ? t.toFixed(this.Cn).replace(/\.?0+$/, '')
            : String(t)),
        i.replace(/(\.[1-9]*)0+$/, (t, i) => i)
      );
    }
  }
  const tt = /[2-9]/g;
  class it {
    constructor(t = 50) {
      (this.yn = 0),
        (this.kn = 1),
        (this.Tn = 1),
        (this.Rn = {}),
        (this.Dn = new Map()),
        (this.En = t);
    }
    Vn() {
      (this.yn = 0),
        this.Dn.clear(),
        (this.kn = 1),
        (this.Tn = 1),
        (this.Rn = {});
    }
    Ei(t, i, s) {
      return this.Bn(t, i, s).width;
    }
    Di(t, i, s) {
      const n = this.Bn(t, i, s);
      return (
        ((n.actualBoundingBoxAscent || 0) - (n.actualBoundingBoxDescent || 0)) /
        2
      );
    }
    Bn(t, i, s) {
      const n = s || tt,
        e = String(i).replace(n, '0');
      if (this.Dn.has(e)) return h(this.Dn.get(e)).In;
      if (this.yn === this.En) {
        const t = this.Rn[this.Tn];
        delete this.Rn[this.Tn], this.Dn.delete(t), this.Tn++, this.yn--;
      }
      t.save(), (t.textBaseline = 'middle');
      const r = t.measureText(e);
      return (
        t.restore(),
        (0 === r.width && i.length) ||
          (this.Dn.set(e, { In: r, An: this.kn }),
          (this.Rn[this.kn] = e),
          this.yn++,
          this.kn++),
        r
      );
    }
  }
  class st {
    constructor(t) {
      (this.zn = null), (this.M = null), (this.On = 'right'), (this.Ln = t);
    }
    Nn(t, i, s) {
      (this.zn = t), (this.M = i), (this.On = s);
    }
    nt(t) {
      null !== this.M &&
        null !== this.zn &&
        this.zn.nt(t, this.M, this.Ln, this.On);
    }
  }
  class nt {
    constructor(t, i, s) {
      (this.Wn = t),
        (this.Ln = new it(50)),
        (this.Fn = i),
        (this.L = s),
        (this.W = -1),
        (this.Gt = new st(this.Ln));
    }
    Tt() {
      const t = this.L.Hn(this.Fn);
      if (null === t) return null;
      const i = t.Un(this.Fn) ? t.$n() : this.Fn.Wt();
      if (null === i) return null;
      const s = t.jn(i);
      if ('overlay' === s) return null;
      const n = this.L.qn();
      return (
        n.P !== this.W && ((this.W = n.P), this.Ln.Vn()),
        this.Gt.Nn(this.Wn.$i(), n, s),
        this.Gt
      );
    }
  }
  class et extends P {
    constructor() {
      super(...arguments), (this.qt = null);
    }
    ht(t) {
      this.qt = t;
    }
    Yn(t, i) {
      if (!this.qt?.Et) return null;
      const { ut: s, ct: n, Kn: e } = this.qt;
      return i >= s - n - 7 && i <= s + n + 7 ? { Xn: this.qt, Kn: e } : null;
    }
    et({
      context: t,
      bitmapSize: i,
      horizontalPixelRatio: s,
      verticalPixelRatio: r,
    }) {
      if (null === this.qt) return;
      if (!1 === this.qt.Et) return;
      const h = Math.round(this.qt.ut * r);
      h < 0 ||
        h > i.height ||
        ((t.lineCap = 'butt'),
        (t.strokeStyle = this.qt.R),
        (t.lineWidth = Math.floor(this.qt.ct * s)),
        n(t, this.qt.Xt),
        e(t, h, 0, i.width));
    }
  }
  class rt {
    constructor(t) {
      (this.Zn = { ut: 0, R: 'rgba(0, 0, 0, 0)', ct: 1, Xt: 0, Et: !1 }),
        (this.Gn = new et()),
        (this.St = !0),
        (this.Jn = t),
        (this.Qn = t.Qt()),
        this.Gn.ht(this.Zn);
    }
    yt() {
      this.St = !0;
    }
    Tt() {
      return this.Jn.Et()
        ? (this.St && (this.te(), (this.St = !1)), this.Gn)
        : null;
    }
  }
  class ht extends rt {
    constructor(t) {
      super(t);
    }
    te() {
      this.Zn.Et = !1;
      const t = this.Jn.Wt(),
        i = t.ie().ie;
      if (2 !== i && 3 !== i) return;
      const s = this.Jn.N();
      if (!s.baseLineVisible || !this.Jn.Et()) return;
      const n = this.Jn.zt();
      null !== n &&
        ((this.Zn.Et = !0),
        (this.Zn.ut = t.Nt(n.Ft, n.Ft)),
        (this.Zn.R = s.baseLineColor),
        (this.Zn.ct = s.baseLineWidth),
        (this.Zn.Xt = s.baseLineStyle));
    }
  }
  class at extends P {
    constructor() {
      super(...arguments), (this.qt = null);
    }
    ht(t) {
      this.qt = t;
    }
    se() {
      return this.qt;
    }
    et({ context: t, horizontalPixelRatio: i, verticalPixelRatio: s }) {
      const n = this.qt;
      if (null === n) return;
      const e = Math.max(1, Math.floor(i)),
        r = (e % 2) / 2,
        h = Math.round(n.ne.x * i) + r,
        a = n.ne.y * s;
      (t.fillStyle = n.ee), t.beginPath();
      const l = Math.max(2, 1.5 * n.re) * i;
      t.arc(h, a, l, 0, 2 * Math.PI, !1),
        t.fill(),
        (t.fillStyle = n.he),
        t.beginPath(),
        t.arc(h, a, n.ft * i, 0, 2 * Math.PI, !1),
        t.fill(),
        (t.lineWidth = e),
        (t.strokeStyle = n.ae),
        t.beginPath(),
        t.arc(h, a, n.ft * i + e / 2, 0, 2 * Math.PI, !1),
        t.stroke();
    }
  }
  const lt = [
    { le: 0, oe: 0.25, _e: 4, ue: 10, ce: 0.25, de: 0, fe: 0.4, pe: 0.8 },
    { le: 0.25, oe: 0.525, _e: 10, ue: 14, ce: 0, de: 0, fe: 0.8, pe: 0 },
    { le: 0.525, oe: 1, _e: 14, ue: 14, ce: 0, de: 0, fe: 0, pe: 0 },
  ];
  class ot {
    constructor(t) {
      (this.Gt = new at()),
        (this.St = !0),
        (this.ve = !0),
        (this.me = performance.now()),
        (this.we = this.me - 1),
        (this.ge = t);
    }
    Me() {
      (this.we = this.me - 1), this.yt();
    }
    be() {
      if ((this.yt(), 2 === this.ge.N().lastPriceAnimation)) {
        const t = performance.now(),
          i = this.we - t;
        if (i > 0) return void (i < 650 && (this.we += 2600));
        (this.me = t), (this.we = t + 2600);
      }
    }
    yt() {
      this.St = !0;
    }
    xe() {
      this.ve = !0;
    }
    Et() {
      return 0 !== this.ge.N().lastPriceAnimation;
    }
    Se() {
      switch (this.ge.N().lastPriceAnimation) {
        case 0:
          return !1;
        case 1:
          return !0;
        case 2:
          return performance.now() <= this.we;
      }
    }
    Tt() {
      return (
        this.St
          ? (this.Rt(), (this.St = !1), (this.ve = !1))
          : this.ve && (this.Ce(), (this.ve = !1)),
        this.Gt
      );
    }
    Rt() {
      this.Gt.ht(null);
      const t = this.ge.Qt().It(),
        i = t.Pe(),
        s = this.ge.zt();
      if (null === i || null === s) return;
      const n = this.ge.ye(!0);
      if (n.ke || !i.Te(n.Re)) return;
      const e = { x: t.jt(n.Re), y: this.ge.Wt().Nt(n.gt, s.Ft) },
        r = n.R,
        h = this.ge.N().lineWidth,
        a = this.De(this.Ee(), r);
      this.Gt.ht({ ee: r, re: h, he: a.he, ae: a.ae, ft: a.ft, ne: e });
    }
    Ce() {
      const t = this.Gt.se();
      if (null !== t) {
        const i = this.De(this.Ee(), t.ee);
        (t.he = i.he), (t.ae = i.ae), (t.ft = i.ft);
      }
    }
    Ee() {
      return this.Se() ? performance.now() - this.me : 2599;
    }
    Ve(t, i, s, n) {
      const e = s + (n - s) * i;
      return this.ge.Qt().Xi().Y(t, e);
    }
    De(t, i) {
      const s = (t % 2600) / 2600;
      let n;
      for (const t of lt)
        if (s >= t.le && s <= t.oe) {
          n = t;
          break;
        }
      r(void 0 !== n, 'Last price animation internal logic error');
      const e = (s - n.le) / (n.oe - n.le);
      return {
        he: this.Ve(i, e, n.ce, n.de),
        ae: this.Ve(i, e, n.fe, n.pe),
        ft: ((h = e), (a = n._e), (l = n.ue), a + (l - a) * h),
      };
      var h, a, l;
    }
  }
  class _t extends rt {
    constructor(t) {
      super(t);
    }
    te() {
      const t = this.Zn;
      t.Et = !1;
      const i = this.Jn.N();
      if (!i.priceLineVisible || !this.Jn.Et()) return;
      const s = this.Jn.ye(0 === i.priceLineSource);
      s.ke ||
        ((t.Et = !0),
        (t.ut = s.Bi),
        (t.R = this.Jn.Be(s.R)),
        (t.ct = i.priceLineWidth),
        (t.Xt = i.priceLineStyle));
    }
  }
  class ut extends L {
    constructor(t) {
      super(), (this.Jt = t);
    }
    ji(t, i, s) {
      (t.Et = !1), (i.Et = !1);
      const n = this.Jt;
      if (!n.Et()) return;
      const e = n.N(),
        r = e.lastValueVisible,
        h = '' !== n.Ie(),
        a = 0 === e.seriesLastValueMode,
        l = n.ye(!1);
      if (l.ke) return;
      r && ((t.ri = this.Ae(l, r, a)), (t.Et = 0 !== t.ri.length)),
        (h || a) && ((i.ri = this.ze(l, r, h, a)), (i.Et = i.ri.length > 0));
      const o = n.Be(l.R),
        _ = this.Jt.Qt().Xi().X(o);
      (s.Z = _.Z),
        (s.Bi = l.Bi),
        (i.Ht = n.Qt().Ut(l.Bi / n.Wt().$t())),
        (t.Ht = o),
        (t.R = _.G),
        (i.R = _.G);
    }
    ze(t, i, s, n) {
      let e = '';
      const r = this.Jt.Ie();
      return (
        s && 0 !== r.length && (e += `${r} `),
        i && n && (e += this.Jt.Wt().Oe() ? t.Le : t.Ne),
        e.trim()
      );
    }
    Ae(t, i, s) {
      return i ? (s ? (this.Jt.Wt().Oe() ? t.Ne : t.Le) : t.ri) : '';
    }
  }
  function ct(t, i, s, n) {
    const e = Number.isFinite(i),
      r = Number.isFinite(s);
    return e && r ? t(i, s) : e || r ? (e ? i : s) : n;
  }
  class dt {
    constructor(t, i) {
      (this.We = t), (this.Fe = i);
    }
    He(t) {
      return null !== t && this.We === t.We && this.Fe === t.Fe;
    }
    Ue() {
      return new dt(this.We, this.Fe);
    }
    $e() {
      return this.We;
    }
    je() {
      return this.Fe;
    }
    qe() {
      return this.Fe - this.We;
    }
    Ki() {
      return (
        this.Fe === this.We || Number.isNaN(this.Fe) || Number.isNaN(this.We)
      );
    }
    vn(t) {
      return null === t
        ? this
        : new dt(
            ct(Math.min, this.$e(), t.$e(), -1 / 0),
            ct(Math.max, this.je(), t.je(), 1 / 0),
          );
    }
    Ye(t) {
      if (!u(t)) return;
      if (0 === this.Fe - this.We) return;
      const i = 0.5 * (this.Fe + this.We);
      let s = this.Fe - i,
        n = this.We - i;
      (s *= t), (n *= t), (this.Fe = i + s), (this.We = i + n);
    }
    Ke(t) {
      u(t) && ((this.Fe += t), (this.We += t));
    }
    Xe() {
      return { minValue: this.We, maxValue: this.Fe };
    }
    static Ze(t) {
      return null === t ? null : new dt(t.minValue, t.maxValue);
    }
  }
  class ft {
    constructor(t, i) {
      (this.Ge = t), (this.Je = i || null);
    }
    Qe() {
      return this.Ge;
    }
    tr() {
      return this.Je;
    }
    Xe() {
      return {
        priceRange: null === this.Ge ? null : this.Ge.Xe(),
        margins: this.Je || void 0,
      };
    }
    static Ze(t) {
      return null === t ? null : new ft(dt.Ze(t.priceRange), t.margins);
    }
  }
  class pt extends rt {
    constructor(t, i) {
      super(t), (this.ir = i);
    }
    te() {
      const t = this.Zn;
      t.Et = !1;
      const i = this.ir.N();
      if (!this.Jn.Et() || !i.lineVisible) return;
      const s = this.ir.sr();
      null !== s &&
        ((t.Et = !0),
        (t.ut = s),
        (t.R = i.color),
        (t.ct = i.lineWidth),
        (t.Xt = i.lineStyle),
        (t.Kn = this.ir.N().id));
    }
  }
  class vt extends L {
    constructor(t, i) {
      super(), (this.ge = t), (this.ir = i);
    }
    ji(t, i, s) {
      (t.Et = !1), (i.Et = !1);
      const n = this.ir.N(),
        e = n.axisLabelVisible,
        r = '' !== n.title,
        h = this.ge;
      if (!e || !h.Et()) return;
      const a = this.ir.sr();
      if (null === a) return;
      r && ((i.ri = n.title), (i.Et = !0)),
        (i.Ht = h.Qt().Ut(a / h.Wt().$t())),
        (t.ri = this.nr(n.price)),
        (t.Et = !0);
      const l = this.ge
        .Qt()
        .Xi()
        .X(n.axisLabelColor || n.color);
      s.Z = l.Z;
      const o = n.axisLabelTextColor || l.G;
      (t.R = o), (i.R = o), (s.Bi = a);
    }
    nr(t) {
      const i = this.ge.zt();
      return null === i ? '' : this.ge.Wt().Zi(t, i.Ft);
    }
  }
  class mt {
    constructor(t, i) {
      (this.ge = t),
        (this.Ps = i),
        (this.er = new pt(t, this)),
        (this.Wn = new vt(t, this)),
        (this.rr = new nt(this.Wn, t, t.Qt()));
    }
    hr(t) {
      _(this.Ps, t), this.yt(), this.ge.Qt().ar();
    }
    N() {
      return this.Ps;
    }
    lr() {
      return this.er;
    }
    _r() {
      return this.rr;
    }
    ur() {
      return this.Wn;
    }
    yt() {
      this.er.yt(), this.Wn.yt();
    }
    sr() {
      const t = this.ge,
        i = t.Wt();
      if (t.Qt().It().Ki() || i.Ki()) return null;
      const s = t.zt();
      return null === s ? null : i.Nt(this.Ps.price, s.Ft);
    }
  }
  class wt extends U {
    constructor(t) {
      super(), (this.ts = t);
    }
    Qt() {
      return this.ts;
    }
  }
  const gt = {
    Bar: (t, i, s, n) => {
      const e = i.upColor,
        r = i.downColor,
        h = a(t(s, n)),
        o = l(h.Ft[0]) <= l(h.Ft[3]);
      return { cr: h.R ?? (o ? e : r) };
    },
    Candlestick: (t, i, s, n) => {
      const e = i.upColor,
        r = i.downColor,
        h = i.borderUpColor,
        o = i.borderDownColor,
        _ = i.wickUpColor,
        u = i.wickDownColor,
        c = a(t(s, n)),
        d = l(c.Ft[0]) <= l(c.Ft[3]);
      return {
        cr: c.R ?? (d ? e : r),
        dr: c.Ht ?? (d ? h : o),
        pr: c.vr ?? (d ? _ : u),
      };
    },
    Custom: (t, i, s, n) => ({ cr: a(t(s, n)).R ?? i.color }),
    Area: (t, i, s, n) => {
      const e = a(t(s, n));
      return {
        cr: e.vt ?? i.lineColor,
        vt: e.vt ?? i.lineColor,
        mr: e.mr ?? i.topColor,
        wr: e.wr ?? i.bottomColor,
      };
    },
    Baseline: (t, i, s, n) => {
      const e = a(t(s, n));
      return {
        cr: e.Ft[3] >= i.baseValue.price ? i.topLineColor : i.bottomLineColor,
        gr: e.gr ?? i.topLineColor,
        Mr: e.Mr ?? i.bottomLineColor,
        br: e.br ?? i.topFillColor1,
        Sr: e.Sr ?? i.topFillColor2,
        Cr: e.Cr ?? i.bottomFillColor1,
        Pr: e.Pr ?? i.bottomFillColor2,
      };
    },
    Line: (t, i, s, n) => {
      const e = a(t(s, n));
      return { cr: e.R ?? i.color, vt: e.R ?? i.color };
    },
    Histogram: (t, i, s, n) => ({ cr: a(t(s, n)).R ?? i.color }),
  };
  class Mt {
    constructor(t) {
      (this.yr = (t, i) => (void 0 !== i ? i.Ft : this.ge.Xs().kr(t))),
        (this.ge = t),
        (this.Tr = gt[t.Rr()]);
    }
    Dr(t, i) {
      return this.Tr(this.yr, this.ge.N(), t, i);
    }
  }
  function bt(t, i, s, n, e = 0, r = i.length) {
    let h = r - e;
    for (; 0 < h; ) {
      const r = h >> 1,
        a = e + r;
      n(i[a], s) === t ? ((e = a + 1), (h -= r + 1)) : (h = r);
    }
    return e;
  }
  const xt = bt.bind(null, !0),
    St = bt.bind(null, !1);
  var Ct;
  !(function (t) {
    (t[(t.NearestLeft = -1)] = 'NearestLeft'),
      (t[(t.None = 0)] = 'None'),
      (t[(t.NearestRight = 1)] = 'NearestRight');
  })(Ct || (Ct = {}));
  const Pt = 30;
  class yt {
    constructor() {
      (this.Er = []),
        (this.Vr = new Map()),
        (this.Br = new Map()),
        (this.Ir = []);
    }
    Ar() {
      return this.zr() > 0 ? this.Er[this.Er.length - 1] : null;
    }
    Or() {
      return this.zr() > 0 ? this.Lr(0) : null;
    }
    Ks() {
      return this.zr() > 0 ? this.Lr(this.Er.length - 1) : null;
    }
    zr() {
      return this.Er.length;
    }
    Ki() {
      return 0 === this.zr();
    }
    Te(t) {
      return null !== this.Nr(t, 0);
    }
    kr(t) {
      return this.Wr(t);
    }
    Wr(t, i = 0) {
      const s = this.Nr(t, i);
      return null === s ? null : { ...this.Fr(s), Re: this.Lr(s) };
    }
    Hr() {
      return this.Er;
    }
    Ur(t, i, s) {
      if (this.Ki()) return null;
      let n = null;
      for (const e of s) {
        n = kt(n, this.$r(t, i, e));
      }
      return n;
    }
    ht(t) {
      this.Br.clear(),
        this.Vr.clear(),
        (this.Er = t),
        (this.Ir = t.map((t) => t.Re));
    }
    jr() {
      return this.Ir;
    }
    Lr(t) {
      return this.Er[t].Re;
    }
    Fr(t) {
      return this.Er[t];
    }
    Nr(t, i) {
      const s = this.qr(t);
      if (null === s && 0 !== i)
        switch (i) {
          case -1:
            return this.Yr(t);
          case 1:
            return this.Kr(t);
          default:
            throw new TypeError('Unknown search mode');
        }
      return s;
    }
    Yr(t) {
      let i = this.Xr(t);
      return (
        i > 0 && (i -= 1), i !== this.Er.length && this.Lr(i) < t ? i : null
      );
    }
    Kr(t) {
      const i = this.Zr(t);
      return i !== this.Er.length && t < this.Lr(i) ? i : null;
    }
    qr(t) {
      const i = this.Xr(t);
      return i === this.Er.length || t < this.Er[i].Re ? null : i;
    }
    Xr(t) {
      return xt(this.Er, t, (t, i) => t.Re < i);
    }
    Zr(t) {
      return St(this.Er, t, (t, i) => t.Re > i);
    }
    Gr(t, i, s) {
      let n = null;
      for (let e = t; e < i; e++) {
        const t = this.Er[e].Ft[s];
        Number.isNaN(t) ||
          (null === n
            ? (n = { Jr: t, Qr: t })
            : (t < n.Jr && (n.Jr = t), t > n.Qr && (n.Qr = t)));
      }
      return n;
    }
    $r(t, i, s) {
      if (this.Ki()) return null;
      let n = null;
      const e = a(this.Or()),
        r = a(this.Ks()),
        h = Math.max(t, e),
        l = Math.min(i, r),
        o = Math.ceil(h / Pt) * Pt,
        _ = Math.max(o, Math.floor(l / Pt) * Pt);
      {
        const t = this.Xr(h),
          e = this.Zr(Math.min(l, o, i));
        n = kt(n, this.Gr(t, e, s));
      }
      let u = this.Vr.get(s);
      void 0 === u && ((u = new Map()), this.Vr.set(s, u));
      for (let t = Math.max(o + 1, h); t < _; t += Pt) {
        const i = Math.floor(t / Pt);
        let e = u.get(i);
        if (void 0 === e) {
          const t = this.Xr(i * Pt),
            n = this.Zr((i + 1) * Pt - 1);
          (e = this.Gr(t, n, s)), u.set(i, e);
        }
        n = kt(n, e);
      }
      {
        const t = this.Xr(_),
          i = this.Zr(l);
        n = kt(n, this.Gr(t, i, s));
      }
      return n;
    }
  }
  function kt(t, i) {
    if (null === t) return i;
    if (null === i) return t;
    return { Jr: Math.min(t.Jr, i.Jr), Qr: Math.max(t.Qr, i.Qr) };
  }
  class Tt {
    constructor(t) {
      this.th = t;
    }
    nt(t, i, s) {
      this.th.draw(t);
    }
    ih(t, i, s) {
      this.th.drawBackground?.(t);
    }
  }
  class Rt {
    constructor(t) {
      (this.Dn = null), (this.sh = t);
    }
    Tt() {
      const t = this.sh.renderer();
      if (null === t) return null;
      if (this.Dn?.nh === t) return this.Dn.eh;
      const i = new Tt(t);
      return (this.Dn = { nh: t, eh: i }), i;
    }
    rh() {
      return this.sh.zOrder?.() ?? 'normal';
    }
  }
  class Dt {
    constructor(t) {
      (this.hh = null), (this.ah = t);
    }
    oh() {
      return this.ah;
    }
    Ns() {
      this.ah.updateAllViews?.();
    }
    Ws() {
      const t = this.ah.paneViews?.() ?? [];
      if (this.hh?.nh === t) return this.hh.eh;
      const i = t.map((t) => new Rt(t));
      return (this.hh = { nh: t, eh: i }), i;
    }
    Yn(t, i) {
      return this.ah.hitTest?.(t, i) ?? null;
    }
  }
  let Et = class extends Dt {
    us() {
      return [];
    }
  };
  class Vt {
    constructor(t) {
      this.th = t;
    }
    nt(t, i, s) {
      this.th.draw(t);
    }
    ih(t, i, s) {
      this.th.drawBackground?.(t);
    }
  }
  class Bt {
    constructor(t) {
      (this.Dn = null), (this.sh = t);
    }
    Tt() {
      const t = this.sh.renderer();
      if (null === t) return null;
      if (this.Dn?.nh === t) return this.Dn.eh;
      const i = new Vt(t);
      return (this.Dn = { nh: t, eh: i }), i;
    }
    rh() {
      return this.sh.zOrder?.() ?? 'normal';
    }
  }
  function It(t) {
    return {
      ri: t.text(),
      Bi: t.coordinate(),
      Vi: t.fixedCoordinate?.(),
      R: t.textColor(),
      Z: t.backColor(),
      Et: t.visible?.() ?? !0,
      pi: t.tickVisible?.() ?? !0,
    };
  }
  class At {
    constructor(t, i) {
      (this.Gt = new F()), (this._h = t), (this.uh = i);
    }
    Tt() {
      return this.Gt.ht({ Qi: this.uh.Qi(), ...It(this._h) }), this.Gt;
    }
  }
  class zt extends L {
    constructor(t, i) {
      super(), (this._h = t), (this.qi = i);
    }
    ji(t, i, s) {
      const n = It(this._h);
      (s.Z = n.Z), (t.R = n.R);
      const e = (2 / 12) * this.qi.P();
      (s.Ti = e),
        (s.Ri = e),
        (s.Bi = n.Bi),
        (s.Vi = n.Vi),
        (t.ri = n.ri),
        (t.Et = n.Et),
        (t.pi = n.pi);
    }
  }
  class Ot extends Dt {
    constructor(t, i) {
      super(t),
        (this.dh = null),
        (this.fh = null),
        (this.ph = null),
        (this.mh = null),
        (this.ge = i);
    }
    cs() {
      const t = this.ah.timeAxisViews?.() ?? [];
      if (this.dh?.nh === t) return this.dh.eh;
      const i = this.ge.Qt().It(),
        s = t.map((t) => new At(t, i));
      return (this.dh = { nh: t, eh: s }), s;
    }
    Fs() {
      const t = this.ah.priceAxisViews?.() ?? [];
      if (this.fh?.nh === t) return this.fh.eh;
      const i = this.ge.Wt(),
        s = t.map((t) => new zt(t, i));
      return (this.fh = { nh: t, eh: s }), s;
    }
    wh() {
      const t = this.ah.priceAxisPaneViews?.() ?? [];
      if (this.ph?.nh === t) return this.ph.eh;
      const i = t.map((t) => new Bt(t));
      return (this.ph = { nh: t, eh: i }), i;
    }
    gh() {
      const t = this.ah.timeAxisPaneViews?.() ?? [];
      if (this.mh?.nh === t) return this.mh.eh;
      const i = t.map((t) => new Bt(t));
      return (this.mh = { nh: t, eh: i }), i;
    }
    Mh(t, i) {
      return this.ah.autoscaleInfo?.(t, i) ?? null;
    }
  }
  function Lt(t, i, s, n) {
    t.forEach((t) => {
      i(t).forEach((t) => {
        t.rh() === s && n.push(t);
      });
    });
  }
  function Nt(t) {
    return t.Ws();
  }
  function Wt(t) {
    return t.wh();
  }
  function Ft(t) {
    return t.gh();
  }
  const Ht = ['Area', 'Line', 'Baseline'];
  class Ut extends wt {
    constructor(t, i, s, n, e) {
      super(t),
        (this.qt = new yt()),
        (this.er = new _t(this)),
        (this.bh = []),
        (this.xh = new ht(this)),
        (this.Sh = null),
        (this.Ch = null),
        (this.Ph = null),
        (this.yh = []),
        (this.Ps = s),
        (this.kh = i);
      const r = new ut(this);
      (this.vs = [r]),
        (this.rr = new nt(r, this, t)),
        Ht.includes(this.kh) && (this.Sh = new ot(this)),
        this.Th(),
        (this.sh = n(this, this.Qt(), e));
    }
    m() {
      null !== this.Ph && clearTimeout(this.Ph);
    }
    Be(t) {
      return this.Ps.priceLineColor || t;
    }
    ye(t) {
      const i = { ke: !0 },
        s = this.Wt();
      if (this.Qt().It().Ki() || s.Ki() || this.qt.Ki()) return i;
      const n = this.Qt().It().Pe(),
        e = this.zt();
      if (null === n || null === e) return i;
      let r, h;
      if (t) {
        const t = this.qt.Ar();
        if (null === t) return i;
        (r = t), (h = t.Re);
      } else {
        const t = this.qt.Wr(n.bi(), -1);
        if (null === t) return i;
        if (((r = this.qt.kr(t.Re)), null === r)) return i;
        h = t.Re;
      }
      const a = r.Ft[3],
        l = this.Rh().Dr(h, { Ft: r }),
        o = s.Nt(a, e.Ft);
      return {
        ke: !1,
        gt: a,
        ri: s.Zi(a, e.Ft),
        Le: s.Dh(a),
        Ne: s.Eh(a, e.Ft),
        R: l.cr,
        Bi: o,
        Re: h,
      };
    }
    Rh() {
      return null !== this.Ch || (this.Ch = new Mt(this)), this.Ch;
    }
    N() {
      return this.Ps;
    }
    hr(t) {
      const i = t.priceScaleId;
      void 0 !== i && i !== this.Ps.priceScaleId && this.Qt().Vh(this, i),
        _(this.Ps, t),
        void 0 !== t.priceFormat && (this.Th(), this.Qt().Bh()),
        this.Qt().Ih(this),
        this.Qt().Ah(),
        this.sh.yt('options');
    }
    ht(t, i) {
      this.qt.ht(t),
        this.sh.yt('data'),
        null !== this.Sh &&
          (i && i.zh ? this.Sh.be() : 0 === t.length && this.Sh.Me());
      const s = this.Qt().Hn(this);
      this.Qt().Oh(s), this.Qt().Ih(this), this.Qt().Ah(), this.Qt().ar();
    }
    Lh(t) {
      const i = new mt(this, t);
      return this.bh.push(i), this.Qt().Ih(this), i;
    }
    Nh(t) {
      const i = this.bh.indexOf(t);
      -1 !== i && this.bh.splice(i, 1), this.Qt().Ih(this);
    }
    Wh() {
      return this.bh;
    }
    Rr() {
      return this.kh;
    }
    zt() {
      const t = this.Fh();
      return null === t ? null : { Ft: t.Ft[3], Hh: t.wt };
    }
    Fh() {
      const t = this.Qt().It().Pe();
      if (null === t) return null;
      const i = t.Uh();
      return this.qt.Wr(i, 1);
    }
    Xs() {
      return this.qt;
    }
    $h(t) {
      const i = this.qt.kr(t);
      return null === i
        ? null
        : 'Bar' === this.kh || 'Candlestick' === this.kh || 'Custom' === this.kh
        ? { jh: i.Ft[0], qh: i.Ft[1], Yh: i.Ft[2], Kh: i.Ft[3] }
        : i.Ft[3];
    }
    Xh(t) {
      const i = [];
      Lt(this.yh, Nt, 'top', i);
      const s = this.Sh;
      return null !== s && s.Et()
        ? (null === this.Ph &&
            s.Se() &&
            (this.Ph = setTimeout(() => {
              (this.Ph = null), this.Qt().Zh();
            }, 0)),
          s.xe(),
          i.unshift(s),
          i)
        : i;
    }
    Ws() {
      const t = [];
      this.Gh() || t.push(this.xh), t.push(this.sh, this.er);
      const i = this.bh.map((t) => t.lr());
      return t.push(...i), Lt(this.yh, Nt, 'normal', t), t;
    }
    Jh() {
      return this.Qh(Nt, 'bottom');
    }
    ta(t) {
      return this.Qh(Wt, t);
    }
    ia(t) {
      return this.Qh(Ft, t);
    }
    sa(t, i) {
      return this.yh.map((s) => s.Yn(t, i)).filter((t) => null !== t);
    }
    us() {
      return [this.rr, ...this.bh.map((t) => t._r())];
    }
    Fs(t, i) {
      if (i !== this.es && !this.Gh()) return [];
      const s = [...this.vs];
      for (const t of this.bh) s.push(t.ur());
      return (
        this.yh.forEach((t) => {
          s.push(...t.Fs());
        }),
        s
      );
    }
    cs() {
      const t = [];
      return (
        this.yh.forEach((i) => {
          t.push(...i.cs());
        }),
        t
      );
    }
    Mh(t, i) {
      if (void 0 !== this.Ps.autoscaleInfoProvider) {
        const s = this.Ps.autoscaleInfoProvider(() => {
          const s = this.na(t, i);
          return null === s ? null : s.Xe();
        });
        return ft.Ze(s);
      }
      return this.na(t, i);
    }
    ea() {
      return this.Ps.priceFormat.minMove;
    }
    ra() {
      return this.ha;
    }
    Ns() {
      this.sh.yt();
      for (const t of this.vs) t.yt();
      for (const t of this.bh) t.yt();
      this.er.yt(), this.xh.yt(), this.Sh?.yt(), this.yh.forEach((t) => t.Ns());
    }
    Wt() {
      return a(super.Wt());
    }
    At(t) {
      if (
        !(
          ('Line' === this.kh ||
            'Area' === this.kh ||
            'Baseline' === this.kh) &&
          this.Ps.crosshairMarkerVisible
        )
      )
        return null;
      const i = this.qt.kr(t);
      if (null === i) return null;
      return {
        gt: i.Ft[3],
        ft: this.aa(),
        Ht: this.la(),
        Lt: this.oa(),
        Ot: this._a(t),
      };
    }
    Ie() {
      return this.Ps.title;
    }
    Et() {
      return this.Ps.visible;
    }
    ua(t) {
      this.yh.push(new Ot(t, this));
    }
    ca(t) {
      this.yh = this.yh.filter((i) => i.oh() !== t);
    }
    da() {
      if ('Custom' === this.kh) return (t) => this.sh.fa(t);
    }
    pa() {
      if ('Custom' === this.kh) return (t) => this.sh.va(t);
    }
    ma() {
      return this.qt.jr();
    }
    Gh() {
      return !q(this.Wt().wa());
    }
    na(t, i) {
      if (!c(t) || !c(i) || this.qt.Ki()) return null;
      const s =
          'Line' === this.kh ||
          'Area' === this.kh ||
          'Baseline' === this.kh ||
          'Histogram' === this.kh
            ? [3]
            : [2, 1],
        n = this.qt.Ur(t, i, s);
      let e = null !== n ? new dt(n.Jr, n.Qr) : null,
        r = null;
      if ('Histogram' === this.Rr()) {
        const t = this.Ps.base,
          i = new dt(t, t);
        e = null !== e ? e.vn(i) : i;
      }
      return (
        this.yh.forEach((s) => {
          const n = s.Mh(t, i);
          if (n?.priceRange) {
            const t = new dt(n.priceRange.minValue, n.priceRange.maxValue);
            e = null !== e ? e.vn(t) : t;
          }
          n?.margins && (r = n.margins);
        }),
        new ft(e, r)
      );
    }
    aa() {
      switch (this.kh) {
        case 'Line':
        case 'Area':
        case 'Baseline':
          return this.Ps.crosshairMarkerRadius;
      }
      return 0;
    }
    la() {
      switch (this.kh) {
        case 'Line':
        case 'Area':
        case 'Baseline': {
          const t = this.Ps.crosshairMarkerBorderColor;
          if (0 !== t.length) return t;
        }
      }
      return null;
    }
    oa() {
      switch (this.kh) {
        case 'Line':
        case 'Area':
        case 'Baseline':
          return this.Ps.crosshairMarkerBorderWidth;
      }
      return 0;
    }
    _a(t) {
      switch (this.kh) {
        case 'Line':
        case 'Area':
        case 'Baseline': {
          const t = this.Ps.crosshairMarkerBackgroundColor;
          if (0 !== t.length) return t;
        }
      }
      return this.Rh().Dr(t).cr;
    }
    Th() {
      switch (this.Ps.priceFormat.type) {
        case 'custom': {
          const t = this.Ps.priceFormat.formatter;
          this.ha = {
            format: t,
            formatTickmarks:
              this.Ps.priceFormat.tickmarksFormatter ?? ((i) => i.map(t)),
          };
          break;
        }
        case 'volume':
          this.ha = new Q(this.Ps.priceFormat.precision);
          break;
        case 'percent':
          this.ha = new J(this.Ps.priceFormat.precision);
          break;
        default: {
          const t = Math.pow(10, this.Ps.priceFormat.precision);
          this.ha = new G(t, this.Ps.priceFormat.minMove * t);
        }
      }
      null !== this.es && this.es.ga();
    }
    Qh(t, i) {
      const s = [];
      return Lt(this.yh, t, i, s), s;
    }
  }
  const $t = [3],
    jt = [0, 1, 2, 3];
  class qt {
    constructor(t) {
      this.Ps = t;
    }
    Ma(t, i, s) {
      let n = t;
      if (0 === this.Ps.mode) return n;
      const e = s.ks(),
        r = e.zt();
      if (null === r) return n;
      const h = e.Nt(t, r),
        a = s
          .ba()
          .filter((t) => t instanceof Ut)
          .reduce((t, n) => {
            if (s.Un(n) || !n.Et()) return t;
            const e = n.Wt(),
              r = n.Xs();
            if (e.Ki() || !r.Te(i)) return t;
            const h = r.kr(i);
            if (null === h) return t;
            const a = l(n.zt()),
              o = 3 === this.Ps.mode ? jt : $t;
            return t.concat(o.map((t) => e.Nt(h.Ft[t], a.Ft)));
          }, []);
      if (0 === a.length) return n;
      a.sort((t, i) => Math.abs(t - h) - Math.abs(i - h));
      const o = a[0];
      return (n = e.Ts(o, r)), n;
    }
  }
  function Yt(t, i, s) {
    return Math.min(Math.max(t, i), s);
  }
  function Kt(t, i, s) {
    return i - t <= s;
  }
  function Xt(t) {
    const i = Math.ceil(t);
    return i % 2 == 0 ? i - 1 : i;
  }
  class Zt extends P {
    constructor() {
      super(...arguments), (this.qt = null);
    }
    ht(t) {
      this.qt = t;
    }
    et({
      context: t,
      bitmapSize: i,
      horizontalPixelRatio: s,
      verticalPixelRatio: e,
    }) {
      if (null === this.qt) return;
      const r = Math.max(1, Math.floor(s));
      (t.lineWidth = r),
        (function (t, i) {
          t.save(), t.lineWidth % 2 && t.translate(0.5, 0.5), i(), t.restore();
        })(t, () => {
          const h = a(this.qt);
          if (h.xa) {
            (t.strokeStyle = h.Sa), n(t, h.Ca), t.beginPath();
            for (const n of h.Pa) {
              const e = Math.round(n.ya * s);
              t.moveTo(e, -r), t.lineTo(e, i.height + r);
            }
            t.stroke();
          }
          if (h.ka) {
            (t.strokeStyle = h.Ta), n(t, h.Ra), t.beginPath();
            for (const s of h.Da) {
              const n = Math.round(s.ya * e);
              t.moveTo(-r, n), t.lineTo(i.width + r, n);
            }
            t.stroke();
          }
        });
    }
  }
  class Gt {
    constructor(t) {
      (this.Gt = new Zt()), (this.St = !0), (this.Pt = t);
    }
    yt() {
      this.St = !0;
    }
    Tt() {
      if (this.St) {
        const t = this.Pt.Qt().N().grid,
          i = {
            ka: t.horzLines.visible,
            xa: t.vertLines.visible,
            Ta: t.horzLines.color,
            Sa: t.vertLines.color,
            Ra: t.horzLines.style,
            Ca: t.vertLines.style,
            Da: this.Pt.ks().Ea(),
            Pa: (this.Pt.Qt().It().Ea() || []).map((t) => ({ ya: t.coord })),
          };
        this.Gt.ht(i), (this.St = !1);
      }
      return this.Gt;
    }
  }
  class Jt {
    constructor(t) {
      this.sh = new Gt(t);
    }
    lr() {
      return this.sh;
    }
  }
  const Qt = { Va: 4, Ba: 1e-4 };
  function ti(t, i) {
    const s = (100 * (t - i)) / i;
    return i < 0 ? -s : s;
  }
  function ii(t, i) {
    const s = ti(t.$e(), i),
      n = ti(t.je(), i);
    return new dt(s, n);
  }
  function si(t, i) {
    const s = (100 * (t - i)) / i + 100;
    return i < 0 ? -s : s;
  }
  function ni(t, i) {
    const s = si(t.$e(), i),
      n = si(t.je(), i);
    return new dt(s, n);
  }
  function ei(t, i) {
    const s = Math.abs(t);
    if (s < 1e-15) return 0;
    const n = Math.log10(s + i.Ba) + i.Va;
    return t < 0 ? -n : n;
  }
  function ri(t, i) {
    const s = Math.abs(t);
    if (s < 1e-15) return 0;
    const n = Math.pow(10, s - i.Va) - i.Ba;
    return t < 0 ? -n : n;
  }
  function hi(t, i) {
    if (null === t) return null;
    const s = ei(t.$e(), i),
      n = ei(t.je(), i);
    return new dt(s, n);
  }
  function ai(t, i) {
    if (null === t) return null;
    const s = ri(t.$e(), i),
      n = ri(t.je(), i);
    return new dt(s, n);
  }
  function li(t) {
    if (null === t) return Qt;
    const i = Math.abs(t.je() - t.$e());
    if (i >= 1 || i < 1e-15) return Qt;
    const s = Math.ceil(Math.abs(Math.log10(i))),
      n = Qt.Va + s;
    return { Va: n, Ba: 1 / Math.pow(10, n) };
  }
  class oi {
    constructor(t, i) {
      if (
        ((this.Ia = t),
        (this.Aa = i),
        (function (t) {
          if (t < 0) return !1;
          for (let i = t; i > 1; i /= 10) if (i % 10 != 0) return !1;
          return !0;
        })(this.Ia))
      )
        this.za = [2, 2.5, 2];
      else {
        this.za = [];
        for (let t = this.Ia; 1 !== t; ) {
          if (t % 2 == 0) this.za.push(2), (t /= 2);
          else {
            if (t % 5 != 0) throw new Error('unexpected base');
            this.za.push(2, 2.5), (t /= 5);
          }
          if (this.za.length > 100)
            throw new Error('something wrong with base');
        }
      }
    }
    Oa(t, i, s) {
      const n = 0 === this.Ia ? 0 : 1 / this.Ia;
      let e = Math.pow(10, Math.max(0, Math.ceil(Math.log10(t - i)))),
        r = 0,
        h = this.Aa[0];
      for (;;) {
        const t = Kt(e, n, 1e-14) && e > n + 1e-14,
          i = Kt(e, s * h, 1e-14),
          a = Kt(e, 1, 1e-14);
        if (!(t && i && a)) break;
        (e /= h), (h = this.Aa[++r % this.Aa.length]);
      }
      if (
        (e <= n + 1e-14 && (e = n),
        (e = Math.max(1, e)),
        this.za.length > 0 &&
          ((a = e), (l = 1), (o = 1e-14), Math.abs(a - l) < o))
      )
        for (r = 0, h = this.za[0]; Kt(e, s * h, 1e-14) && e > n + 1e-14; )
          (e /= h), (h = this.za[++r % this.za.length]);
      var a, l, o;
      return e;
    }
  }
  class _i {
    constructor(t, i, s, n) {
      (this.La = []),
        (this.qi = t),
        (this.Ia = i),
        (this.Na = s),
        (this.Wa = n);
    }
    Oa(t, i) {
      if (t < i) throw new Error('high < low');
      const s = this.qi.$t(),
        n = ((t - i) * this.Fa()) / s,
        e = new oi(this.Ia, [2, 2.5, 2]),
        r = new oi(this.Ia, [2, 2, 2.5]),
        h = new oi(this.Ia, [2.5, 2, 2]),
        a = [];
      return (
        a.push(e.Oa(t, i, n), r.Oa(t, i, n), h.Oa(t, i, n)),
        (function (t) {
          if (t.length < 1) throw Error('array is empty');
          let i = t[0];
          for (let s = 1; s < t.length; ++s) t[s] < i && (i = t[s]);
          return i;
        })(a)
      );
    }
    Ha() {
      const t = this.qi,
        i = t.zt();
      if (null === i) return void (this.La = []);
      const s = t.$t(),
        n = this.Na(s - 1, i),
        e = this.Na(0, i),
        r = this.qi.N().entireTextOnly ? this.Ua() / 2 : 0,
        h = r,
        a = s - 1 - r,
        l = Math.max(n, e),
        o = Math.min(n, e);
      if (l === o) return void (this.La = []);
      const _ = this.Oa(l, o);
      if ((this.$a(i, _, l, o, h, a), t.ja() && this.qa(_, o, l))) {
        const t = this.qi.Ya();
        this.Ka(i, _, h, a, t, 2 * t);
      }
      const u = this.La.map((t) => t.Xa),
        c = this.qi.Za(u);
      for (let t = 0; t < this.La.length; t++) this.La[t].Ga = c[t];
    }
    Ea() {
      return this.La;
    }
    Ua() {
      return this.qi.P();
    }
    Fa() {
      return Math.ceil(2.5 * this.Ua());
    }
    $a(t, i, s, n, e, r) {
      const h = this.La,
        a = this.qi;
      let l = s % i;
      l += l < 0 ? i : 0;
      const o = s >= n ? 1 : -1;
      let _ = null,
        u = 0;
      for (let c = s - l; c > n; c -= i) {
        const s = this.Wa(c, t, !0);
        (null !== _ && Math.abs(s - _) < this.Fa()) ||
          s < e ||
          s > r ||
          (u < h.length
            ? ((h[u].ya = s), (h[u].Ga = a.Ja(c)), (h[u].Xa = c))
            : h.push({ ya: s, Ga: a.Ja(c), Xa: c }),
          u++,
          (_ = s),
          a.Qa() && (i = this.Oa(c * o, n)));
      }
      h.length = u;
    }
    Ka(t, i, s, n, e, r) {
      const h = this.La,
        a = this.tl(t, s, e, r),
        l = this.tl(t, n, -r, -e),
        o = this.Wa(0, t, !0) - this.Wa(i, t, !0);
      h.length > 0 && h[0].ya - a.ya < o / 2 && h.shift(),
        h.length > 0 && l.ya - h[h.length - 1].ya < o / 2 && h.pop(),
        h.unshift(a),
        h.push(l);
    }
    tl(t, i, s, n) {
      const e = (s + n) / 2,
        r = this.Na(i + s, t),
        h = this.Na(i + n, t),
        a = Math.min(r, h),
        l = Math.max(r, h),
        o = Math.max(0.1, this.Oa(l, a)),
        _ = this.Na(i + e, t),
        u = _ - (_ % o),
        c = this.Wa(u, t, !0);
      return { Ga: this.qi.Ja(u), ya: c, Xa: u };
    }
    qa(t, i, s) {
      let n = l(this.qi.Qe());
      return (
        this.qi.Qa() && (n = ai(n, this.qi.il())),
        n.$e() - i < t && s - n.je() < t
      );
    }
  }
  function ui(t) {
    return t.slice().sort((t, i) => a(t.hs()) - a(i.hs()));
  }
  var ci;
  !(function (t) {
    (t[(t.Normal = 0)] = 'Normal'),
      (t[(t.Logarithmic = 1)] = 'Logarithmic'),
      (t[(t.Percentage = 2)] = 'Percentage'),
      (t[(t.IndexedTo100 = 3)] = 'IndexedTo100');
  })(ci || (ci = {}));
  const di = new J(),
    fi = new G(100, 1);
  class pi {
    constructor(t, i, s, n, e) {
      (this.sl = 0),
        (this.nl = null),
        (this.Ge = null),
        (this.el = null),
        (this.rl = { hl: !1, al: null }),
        (this.ll = !1),
        (this.ol = 0),
        (this._l = 0),
        (this.ul = new o()),
        (this.cl = new o()),
        (this.dl = []),
        (this.fl = null),
        (this.pl = null),
        (this.vl = null),
        (this.ml = null),
        (this.wl = null),
        (this.ha = fi),
        (this.gl = li(null)),
        (this.Ml = t),
        (this.Ps = i),
        (this.bl = s),
        (this.xl = n),
        (this.Sl = e),
        (this.Cl = new _i(this, 100, this.Pl.bind(this), this.yl.bind(this)));
    }
    wa() {
      return this.Ml;
    }
    N() {
      return this.Ps;
    }
    hr(t) {
      if (
        (_(this.Ps, t),
        this.ga(),
        void 0 !== t.mode && this.kl({ ie: t.mode }),
        void 0 !== t.scaleMargins)
      ) {
        const i = h(t.scaleMargins.top),
          s = h(t.scaleMargins.bottom);
        if (i < 0 || i > 1)
          throw new Error(
            `Invalid top margin - expect value between 0 and 1, given=${i}`,
          );
        if (s < 0 || s > 1)
          throw new Error(
            `Invalid bottom margin - expect value between 0 and 1, given=${s}`,
          );
        if (i + s > 1)
          throw new Error(
            `Invalid margins - sum of margins must be less than 1, given=${
              i + s
            }`,
          );
        this.Tl(), (this.vl = null);
      }
    }
    Rl() {
      return this.Ps.autoScale;
    }
    Dl() {
      return this.ll;
    }
    Qa() {
      return 1 === this.Ps.mode;
    }
    Oe() {
      return 2 === this.Ps.mode;
    }
    El() {
      return 3 === this.Ps.mode;
    }
    il() {
      return this.gl;
    }
    ie() {
      return {
        sn: this.Ps.autoScale,
        Vl: this.Ps.invertScale,
        ie: this.Ps.mode,
      };
    }
    kl(t) {
      const i = this.ie();
      let s = null;
      void 0 !== t.sn && (this.Ps.autoScale = t.sn),
        void 0 !== t.ie &&
          ((this.Ps.mode = t.ie),
          (2 !== t.ie && 3 !== t.ie) || (this.Ps.autoScale = !0),
          (this.rl.hl = !1)),
        1 === i.ie &&
          t.ie !== i.ie &&
          (!(function (t, i) {
            if (null === t) return !1;
            const s = ri(t.$e(), i),
              n = ri(t.je(), i);
            return isFinite(s) && isFinite(n);
          })(this.Ge, this.gl)
            ? (this.Ps.autoScale = !0)
            : ((s = ai(this.Ge, this.gl)), null !== s && this.Bl(s))),
        1 === t.ie &&
          t.ie !== i.ie &&
          ((s = hi(this.Ge, this.gl)), null !== s && this.Bl(s));
      const n = i.ie !== this.Ps.mode;
      n && (2 === i.ie || this.Oe()) && this.ga(),
        n && (3 === i.ie || this.El()) && this.ga(),
        void 0 !== t.Vl &&
          i.Vl !== t.Vl &&
          ((this.Ps.invertScale = t.Vl), this.Il()),
        this.cl.p(i, this.ie());
    }
    Al() {
      return this.cl;
    }
    P() {
      return this.bl.fontSize;
    }
    $t() {
      return this.sl;
    }
    zl(t) {
      this.sl !== t && ((this.sl = t), this.Tl(), (this.vl = null));
    }
    Ol() {
      if (this.nl) return this.nl;
      const t = this.$t() - this.Ll() - this.Nl();
      return (this.nl = t), t;
    }
    Qe() {
      return this.Wl(), this.Ge;
    }
    Bl(t, i) {
      const s = this.Ge;
      (i || (null === s && null !== t) || (null !== s && !s.He(t))) &&
        ((this.vl = null), (this.Ge = t));
    }
    Fl(t) {
      this.Bl(t), this.Hl(null !== t);
    }
    Ki() {
      return this.Wl(), 0 === this.sl || !this.Ge || this.Ge.Ki();
    }
    Ul(t) {
      return this.Vl() ? t : this.$t() - 1 - t;
    }
    Nt(t, i) {
      return (
        this.Oe() ? (t = ti(t, i)) : this.El() && (t = si(t, i)), this.yl(t, i)
      );
    }
    $l(t, i, s) {
      this.Wl();
      const n = this.Nl(),
        e = a(this.Qe()),
        r = e.$e(),
        h = e.je(),
        l = this.Ol() - 1,
        o = this.Vl(),
        _ = l / (h - r),
        u = void 0 === s ? 0 : s.from,
        c = void 0 === s ? t.length : s.to,
        d = this.jl();
      for (let s = u; s < c; s++) {
        const e = t[s],
          h = e.gt;
        if (isNaN(h)) continue;
        let a = h;
        null !== d && (a = d(e.gt, i));
        const l = n + _ * (a - r),
          u = o ? l : this.sl - 1 - l;
        e.ut = u;
      }
    }
    ql(t, i, s) {
      this.Wl();
      const n = this.Nl(),
        e = a(this.Qe()),
        r = e.$e(),
        h = e.je(),
        l = this.Ol() - 1,
        o = this.Vl(),
        _ = l / (h - r),
        u = void 0 === s ? 0 : s.from,
        c = void 0 === s ? t.length : s.to,
        d = this.jl();
      for (let s = u; s < c; s++) {
        const e = t[s];
        let h = e.jh,
          a = e.qh,
          l = e.Yh,
          u = e.Kh;
        null !== d &&
          ((h = d(e.jh, i)),
          (a = d(e.qh, i)),
          (l = d(e.Yh, i)),
          (u = d(e.Kh, i)));
        let c = n + _ * (h - r),
          f = o ? c : this.sl - 1 - c;
        (e.Yl = f),
          (c = n + _ * (a - r)),
          (f = o ? c : this.sl - 1 - c),
          (e.Kl = f),
          (c = n + _ * (l - r)),
          (f = o ? c : this.sl - 1 - c),
          (e.Xl = f),
          (c = n + _ * (u - r)),
          (f = o ? c : this.sl - 1 - c),
          (e.Zl = f);
      }
    }
    Ts(t, i) {
      const s = this.Pl(t, i);
      return this.Gl(s, i);
    }
    Gl(t, i) {
      let s = t;
      return (
        this.Oe()
          ? (s = (function (t, i) {
              return i < 0 && (t = -t), (t / 100) * i + i;
            })(s, i))
          : this.El() &&
            (s = (function (t, i) {
              return (t -= 100), i < 0 && (t = -t), (t / 100) * i + i;
            })(s, i)),
        s
      );
    }
    ba() {
      return this.dl;
    }
    Dt() {
      return this.pl || (this.pl = ui(this.dl)), this.pl;
    }
    Jl(t) {
      -1 === this.dl.indexOf(t) && (this.dl.push(t), this.ga(), this.Ql());
    }
    io(t) {
      const i = this.dl.indexOf(t);
      if (-1 === i) throw new Error('source is not attached to scale');
      this.dl.splice(i, 1),
        0 === this.dl.length && (this.kl({ sn: !0 }), this.Bl(null)),
        this.ga(),
        this.Ql();
    }
    zt() {
      let t = null;
      for (const i of this.dl) {
        const s = i.zt();
        null !== s && (null === t || s.Hh < t.Hh) && (t = s);
      }
      return null === t ? null : t.Ft;
    }
    Vl() {
      return this.Ps.invertScale;
    }
    Ea() {
      const t = null === this.zt();
      if (null !== this.vl && (t || this.vl.so === t)) return this.vl.Ea;
      this.Cl.Ha();
      const i = this.Cl.Ea();
      return (this.vl = { Ea: i, so: t }), this.ul.p(), i;
    }
    no() {
      return this.ul;
    }
    eo(t) {
      this.Oe() ||
        this.El() ||
        (null === this.ml &&
          null === this.el &&
          (this.Ki() ||
            ((this.ml = this.sl - t), (this.el = a(this.Qe()).Ue()))));
    }
    ro(t) {
      if (this.Oe() || this.El()) return;
      if (null === this.ml) return;
      this.kl({ sn: !1 }), (t = this.sl - t) < 0 && (t = 0);
      let i = (this.ml + 0.2 * (this.sl - 1)) / (t + 0.2 * (this.sl - 1));
      const s = a(this.el).Ue();
      (i = Math.max(i, 0.1)), s.Ye(i), this.Bl(s);
    }
    ho() {
      this.Oe() || this.El() || ((this.ml = null), (this.el = null));
    }
    ao(t) {
      this.Rl() ||
        (null === this.wl &&
          null === this.el &&
          (this.Ki() || ((this.wl = t), (this.el = a(this.Qe()).Ue()))));
    }
    lo(t) {
      if (this.Rl()) return;
      if (null === this.wl) return;
      const i = a(this.Qe()).qe() / (this.Ol() - 1);
      let s = t - this.wl;
      this.Vl() && (s *= -1);
      const n = s * i,
        e = a(this.el).Ue();
      e.Ke(n), this.Bl(e, !0), (this.vl = null);
    }
    oo() {
      this.Rl() || (null !== this.wl && ((this.wl = null), (this.el = null)));
    }
    ra() {
      return this.ha || this.ga(), this.ha;
    }
    Zi(t, i) {
      switch (this.Ps.mode) {
        case 2:
          return this._o(ti(t, i));
        case 3:
          return this.ra().format(si(t, i));
        default:
          return this.nr(t);
      }
    }
    Ja(t) {
      switch (this.Ps.mode) {
        case 2:
          return this._o(t);
        case 3:
          return this.ra().format(t);
        default:
          return this.nr(t);
      }
    }
    Za(t) {
      switch (this.Ps.mode) {
        case 2:
          return this.uo(t);
        case 3:
          return this.ra().formatTickmarks(t);
        default:
          return this.co(t);
      }
    }
    Dh(t) {
      return this.nr(t, a(this.fl).ra());
    }
    Eh(t, i) {
      return (t = ti(t, i)), this._o(t, di);
    }
    do() {
      return this.dl;
    }
    fo(t) {
      this.rl = { al: t, hl: !1 };
    }
    Ns() {
      this.dl.forEach((t) => t.Ns());
    }
    ja() {
      return this.Ps.ensureEdgeTickMarksVisible && this.Rl();
    }
    Ya() {
      return this.P() / 2;
    }
    ga() {
      this.vl = null;
      let t = 1 / 0;
      this.fl = null;
      for (const i of this.dl) i.hs() < t && ((t = i.hs()), (this.fl = i));
      let i = 100;
      null !== this.fl && (i = Math.round(1 / this.fl.ea())),
        (this.ha = fi),
        this.Oe()
          ? ((this.ha = di), (i = 100))
          : this.El()
          ? ((this.ha = new G(100, 1)), (i = 100))
          : null !== this.fl && (this.ha = this.fl.ra()),
        (this.Cl = new _i(this, i, this.Pl.bind(this), this.yl.bind(this))),
        this.Cl.Ha();
    }
    Ql() {
      this.pl = null;
    }
    Xi() {
      return this.Sl;
    }
    Hl(t) {
      this.ll = t;
    }
    Ll() {
      return this.Vl()
        ? this.Ps.scaleMargins.bottom * this.$t() + this._l
        : this.Ps.scaleMargins.top * this.$t() + this.ol;
    }
    Nl() {
      return this.Vl()
        ? this.Ps.scaleMargins.top * this.$t() + this.ol
        : this.Ps.scaleMargins.bottom * this.$t() + this._l;
    }
    Wl() {
      this.rl.hl || ((this.rl.hl = !0), this.po());
    }
    Tl() {
      this.nl = null;
    }
    yl(t, i) {
      if ((this.Wl(), this.Ki())) return 0;
      t = this.Qa() && t ? ei(t, this.gl) : t;
      const s = a(this.Qe()),
        n = this.Nl() + ((this.Ol() - 1) * (t - s.$e())) / s.qe();
      return this.Ul(n);
    }
    Pl(t, i) {
      if ((this.Wl(), this.Ki())) return 0;
      const s = this.Ul(t),
        n = a(this.Qe()),
        e = n.$e() + n.qe() * ((s - this.Nl()) / (this.Ol() - 1));
      return this.Qa() ? ri(e, this.gl) : e;
    }
    Il() {
      (this.vl = null), this.Cl.Ha();
    }
    po() {
      if (this.Dl() && !this.Rl()) return;
      const t = this.rl.al;
      if (null === t) return;
      let i = null;
      const s = this.do();
      let n = 0,
        e = 0;
      for (const r of s) {
        if (!r.Et()) continue;
        const s = r.zt();
        if (null === s) continue;
        const h = r.Mh(t.Uh(), t.bi());
        let l = h && h.Qe();
        if (null !== l) {
          switch (this.Ps.mode) {
            case 1:
              l = hi(l, this.gl);
              break;
            case 2:
              l = ii(l, s.Ft);
              break;
            case 3:
              l = ni(l, s.Ft);
          }
          if (((i = null === i ? l : i.vn(a(l))), null !== h)) {
            const t = h.tr();
            null !== t &&
              ((n = Math.max(n, t.above)), (e = Math.max(e, t.below)));
          }
        }
      }
      if (
        (this.ja() &&
          ((n = Math.max(n, this.Ya())), (e = Math.max(e, this.Ya()))),
        (n === this.ol && e === this._l) ||
          ((this.ol = n), (this._l = e), (this.vl = null), this.Tl()),
        null !== i)
      ) {
        if (i.$e() === i.je()) {
          const t = this.fl,
            s = 5 * (null === t || this.Oe() || this.El() ? 1 : t.ea());
          this.Qa() && (i = ai(i, this.gl)),
            (i = new dt(i.$e() - s, i.je() + s)),
            this.Qa() && (i = hi(i, this.gl));
        }
        if (this.Qa()) {
          const t = ai(i, this.gl),
            s = li(t);
          if (((r = s), (h = this.gl), r.Va !== h.Va || r.Ba !== h.Ba)) {
            const n = null !== this.el ? ai(this.el, this.gl) : null;
            (this.gl = s), (i = hi(t, s)), null !== n && (this.el = hi(n, s));
          }
        }
        this.Bl(i);
      } else
        null === this.Ge && (this.Bl(new dt(-0.5, 0.5)), (this.gl = li(null)));
      var r, h;
    }
    jl() {
      return this.Oe()
        ? ti
        : this.El()
        ? si
        : this.Qa()
        ? (t) => ei(t, this.gl)
        : null;
    }
    vo(t, i, s) {
      return void 0 === i
        ? (void 0 === s && (s = this.ra()), s.format(t))
        : i(t);
    }
    mo(t, i, s) {
      return void 0 === i
        ? (void 0 === s && (s = this.ra()), s.formatTickmarks(t))
        : i(t);
    }
    nr(t, i) {
      return this.vo(t, this.xl.priceFormatter, i);
    }
    co(t, i) {
      const s = this.xl.priceFormatter;
      return this.mo(
        t,
        this.xl.tickmarksPriceFormatter ?? (s ? (t) => t.map(s) : void 0),
        i,
      );
    }
    _o(t, i) {
      return this.vo(t, this.xl.percentageFormatter, i);
    }
    uo(t, i) {
      const s = this.xl.percentageFormatter;
      return this.mo(
        t,
        this.xl.tickmarksPercentageFormatter ?? (s ? (t) => t.map(s) : void 0),
        i,
      );
    }
  }
  function vi(t) {
    return t instanceof Ut;
  }
  class mi {
    constructor(t, i) {
      (this.dl = []),
        (this.wo = new Map()),
        (this.sl = 0),
        (this.Mo = 0),
        (this.bo = 1),
        (this.pl = null),
        (this.xo = !1),
        (this.So = new o()),
        (this.yh = []),
        (this.uh = t),
        (this.ts = i),
        (this.Co = new Jt(this));
      const s = i.N();
      (this.Po = this.yo('left', s.leftPriceScale)),
        (this.ko = this.yo('right', s.rightPriceScale)),
        this.Po.Al().i(this.To.bind(this, this.Po), this),
        this.ko.Al().i(this.To.bind(this, this.ko), this),
        this.Ro(s);
    }
    Ro(t) {
      if (
        (t.leftPriceScale && this.Po.hr(t.leftPriceScale),
        t.rightPriceScale && this.ko.hr(t.rightPriceScale),
        t.localization && (this.Po.ga(), this.ko.ga()),
        t.overlayPriceScales)
      ) {
        const i = Array.from(this.wo.values());
        for (const s of i) {
          const i = a(s[0].Wt());
          i.hr(t.overlayPriceScales), t.localization && i.ga();
        }
      }
    }
    Do(t) {
      switch (t) {
        case 'left':
          return this.Po;
        case 'right':
          return this.ko;
      }
      return this.wo.has(t) ? h(this.wo.get(t))[0].Wt() : null;
    }
    m() {
      this.Qt().Eo().u(this),
        this.Po.Al().u(this),
        this.ko.Al().u(this),
        this.dl.forEach((t) => {
          t.m && t.m();
        }),
        (this.yh = this.yh.filter((t) => {
          const i = t.oh();
          return i.detached && i.detached(), !1;
        })),
        this.So.p();
    }
    Vo() {
      return this.bo;
    }
    Bo(t) {
      this.bo = t;
    }
    Qt() {
      return this.ts;
    }
    Qi() {
      return this.Mo;
    }
    $t() {
      return this.sl;
    }
    Io(t) {
      (this.Mo = t), this.Ao();
    }
    zl(t) {
      (this.sl = t),
        this.Po.zl(t),
        this.ko.zl(t),
        this.dl.forEach((i) => {
          if (this.Un(i)) {
            const s = i.Wt();
            null !== s && s.zl(t);
          }
        }),
        this.Ao();
    }
    zo(t) {
      this.xo = t;
    }
    Oo() {
      return this.xo;
    }
    Lo() {
      return this.dl.filter(vi);
    }
    ba() {
      return this.dl;
    }
    Un(t) {
      const i = t.Wt();
      return null === i || (this.Po !== i && this.ko !== i);
    }
    Jl(t, i, s) {
      this.No(t, i, s ? t.hs() : this.dl.length);
    }
    io(t, i) {
      const s = this.dl.indexOf(t);
      r(-1 !== s, 'removeDataSource: invalid data source'),
        this.dl.splice(s, 1),
        i || this.dl.forEach((t, i) => t.ls(i));
      const n = a(t.Wt()).wa();
      if (this.wo.has(n)) {
        const i = h(this.wo.get(n)),
          s = i.indexOf(t);
        -1 !== s && (i.splice(s, 1), 0 === i.length && this.wo.delete(n));
      }
      const e = t.Wt();
      e && e.ba().indexOf(t) >= 0 && (e.io(t), this.Wo(e)), (this.pl = null);
    }
    jn(t) {
      return t === this.Po ? 'left' : t === this.ko ? 'right' : 'overlay';
    }
    Fo() {
      return this.Po;
    }
    Ho() {
      return this.ko;
    }
    Uo(t, i) {
      t.eo(i);
    }
    $o(t, i) {
      t.ro(i), this.Ao();
    }
    jo(t) {
      t.ho();
    }
    qo(t, i) {
      t.ao(i);
    }
    Yo(t, i) {
      t.lo(i), this.Ao();
    }
    Ko(t) {
      t.oo();
    }
    Ao() {
      this.dl.forEach((t) => {
        t.Ns();
      });
    }
    ks() {
      let t = null;
      return (
        this.ts.N().rightPriceScale.visible && 0 !== this.ko.ba().length
          ? (t = this.ko)
          : this.ts.N().leftPriceScale.visible && 0 !== this.Po.ba().length
          ? (t = this.Po)
          : 0 !== this.dl.length && (t = this.dl[0].Wt()),
        null === t && (t = this.ko),
        t
      );
    }
    $n() {
      let t = null;
      return (
        this.ts.N().rightPriceScale.visible
          ? (t = this.ko)
          : this.ts.N().leftPriceScale.visible && (t = this.Po),
        t
      );
    }
    Wo(t) {
      null !== t && t.Rl() && this.Xo(t);
    }
    Zo(t) {
      const i = this.uh.Pe();
      t.kl({ sn: !0 }), null !== i && t.fo(i), this.Ao();
    }
    Go() {
      this.Xo(this.Po), this.Xo(this.ko);
    }
    Jo() {
      this.Wo(this.Po),
        this.Wo(this.ko),
        this.dl.forEach((t) => {
          this.Un(t) && this.Wo(t.Wt());
        }),
        this.Ao(),
        this.ts.ar();
    }
    Dt() {
      return null === this.pl && (this.pl = ui(this.dl)), this.pl;
    }
    Qo(t, i) {
      i = Yt(i, 0, this.dl.length - 1);
      const s = this.dl.indexOf(t);
      r(-1 !== s, 'setSeriesOrder: invalid data source'),
        this.dl.splice(s, 1),
        this.dl.splice(i, 0, t),
        this.dl.forEach((t, i) => t.ls(i)),
        (this.pl = null);
      for (const t of [this.Po, this.ko]) t.Ql(), t.ga();
      this.ts.ar();
    }
    Vt() {
      return this.Dt().filter(vi);
    }
    t_() {
      return this.So;
    }
    i_() {
      return this.Co;
    }
    ua(t) {
      this.yh.push(new Et(t));
    }
    ca(t) {
      (this.yh = this.yh.filter((i) => i.oh() !== t)),
        t.detached && t.detached(),
        this.ts.ar();
    }
    s_() {
      return this.yh;
    }
    sa(t, i) {
      return this.yh.map((s) => s.Yn(t, i)).filter((t) => null !== t);
    }
    Xo(t) {
      const i = t.do();
      if (i && i.length > 0 && !this.uh.Ki()) {
        const i = this.uh.Pe();
        null !== i && t.fo(i);
      }
      t.Ns();
    }
    No(t, i, s) {
      let n = this.Do(i);
      if (
        (null === n && (n = this.yo(i, this.ts.N().overlayPriceScales)),
        this.dl.splice(s, 0, t),
        !q(i))
      ) {
        const s = this.wo.get(i) || [];
        s.push(t), this.wo.set(i, s);
      }
      t.ls(s), n.Jl(t), t._s(n), this.Wo(n), (this.pl = null);
    }
    To(t, i, s) {
      i.ie !== s.ie && this.Xo(t);
    }
    yo(t, i) {
      const s = { visible: !0, autoScale: !0, ...p(i) },
        n = new pi(
          t,
          s,
          this.ts.N().layout,
          this.ts.N().localization,
          this.ts.Xi(),
        );
      return n.zl(this.$t()), n;
    }
  }
  function wi(t) {
    return { n_: t.n_, e_: { Kn: t.r_.externalId }, h_: t.r_.cursorStyle };
  }
  function gi(t, i, s, n) {
    for (const e of t) {
      const t = e.Tt(n);
      if (null !== t && t.Yn) {
        const n = t.Yn(i, s);
        if (null !== n) return { a_: e, e_: n };
      }
    }
    return null;
  }
  function Mi(t) {
    return void 0 !== t.Ws;
  }
  function bi(t, i, s) {
    const n = [t, ...t.Dt()],
      e = (function (t, i, s) {
        let n, e;
        for (const a of t) {
          const t = a.sa?.(i, s) ?? [];
          for (const i of t)
            (r = i.zOrder),
              (h = n?.zOrder),
              (!h ||
                ('top' === r && 'top' !== h) ||
                ('normal' === r && 'bottom' === h)) &&
                ((n = i), (e = a));
        }
        var r, h;
        return n && e ? { r_: n, n_: e } : null;
      })(n, i, s);
    if ('top' === e?.r_.zOrder) return wi(e);
    for (const r of n) {
      if (e && e.n_ === r && 'bottom' !== e.r_.zOrder && !e.r_.isBackground)
        return wi(e);
      if (Mi(r)) {
        const n = gi(r.Ws(t), i, s, t);
        if (null !== n) return { n_: r, a_: n.a_, e_: n.e_ };
      }
      if (e && e.n_ === r && 'bottom' !== e.r_.zOrder && e.r_.isBackground)
        return wi(e);
    }
    return e?.r_ ? wi(e) : null;
  }
  class xi {
    constructor(t, i, s = 50) {
      (this.yn = 0),
        (this.kn = 1),
        (this.Tn = 1),
        (this.Dn = new Map()),
        (this.Rn = new Map()),
        (this.l_ = t),
        (this.o_ = i),
        (this.En = s);
    }
    __(t) {
      const i = t.time,
        s = this.o_.cacheKey(i),
        n = this.Dn.get(s);
      if (void 0 !== n) return n.u_;
      if (this.yn === this.En) {
        const t = this.Rn.get(this.Tn);
        this.Rn.delete(this.Tn), this.Dn.delete(h(t)), this.Tn++, this.yn--;
      }
      const e = this.l_(t);
      return (
        this.Dn.set(s, { u_: e, An: this.kn }),
        this.Rn.set(this.kn, s),
        this.yn++,
        this.kn++,
        e
      );
    }
  }
  class Si {
    constructor(t, i) {
      r(t <= i, 'right should be >= left'), (this.c_ = t), (this.d_ = i);
    }
    Uh() {
      return this.c_;
    }
    bi() {
      return this.d_;
    }
    f_() {
      return this.d_ - this.c_ + 1;
    }
    Te(t) {
      return this.c_ <= t && t <= this.d_;
    }
    He(t) {
      return this.c_ === t.Uh() && this.d_ === t.bi();
    }
  }
  function Ci(t, i) {
    return null === t || null === i ? t === i : t.He(i);
  }
  class Pi {
    constructor() {
      (this.p_ = new Map()), (this.Dn = null), (this.v_ = !1);
    }
    m_(t) {
      (this.v_ = t), (this.Dn = null);
    }
    w_(t, i) {
      this.g_(i), (this.Dn = null);
      for (let s = i; s < t.length; ++s) {
        const i = t[s];
        let n = this.p_.get(i.timeWeight);
        void 0 === n && ((n = []), this.p_.set(i.timeWeight, n)),
          n.push({
            index: s,
            time: i.time,
            weight: i.timeWeight,
            originalTime: i.originalTime,
          });
      }
    }
    M_(t, i, s, n, e) {
      const r = Math.ceil(i / t);
      return (
        (null !== this.Dn &&
          this.Dn.b_ === r &&
          e === this.Dn.x_ &&
          s === this.Dn.S_) ||
          (this.Dn = { x_: e, S_: s, Ea: this.C_(r, s, n), b_: r }),
        this.Dn.Ea
      );
    }
    g_(t) {
      if (0 === t) return void this.p_.clear();
      const i = [];
      this.p_.forEach((s, n) => {
        t <= s[0].index
          ? i.push(n)
          : s.splice(
              xt(s, t, (i) => i.index < t),
              1 / 0,
            );
      });
      for (const t of i) this.p_.delete(t);
    }
    C_(t, i, s) {
      let n = [];
      const e = (t) => !i || s.has(t.index);
      for (const i of Array.from(this.p_.keys()).sort((t, i) => i - t)) {
        if (!this.p_.get(i)) continue;
        const s = n;
        n = [];
        const r = s.length;
        let a = 0;
        const l = h(this.p_.get(i)),
          o = l.length;
        let _ = 1 / 0,
          u = -1 / 0;
        for (let i = 0; i < o; i++) {
          const h = l[i],
            o = h.index;
          for (; a < r; ) {
            const t = s[a],
              i = t.index;
            if (!(i < o && e(t))) {
              _ = i;
              break;
            }
            a++, n.push(t), (u = i), (_ = 1 / 0);
          }
          if (_ - o >= t && o - u >= t && e(h)) n.push(h), (u = o);
          else if (this.v_) return s;
        }
        for (; a < r; a++) e(s[a]) && n.push(s[a]);
      }
      return n;
    }
  }
  class yi {
    constructor(t) {
      this.P_ = t;
    }
    y_() {
      return null === this.P_
        ? null
        : new Si(Math.floor(this.P_.Uh()), Math.ceil(this.P_.bi()));
    }
    k_() {
      return this.P_;
    }
    static T_() {
      return new yi(null);
    }
  }
  function ki(t, i) {
    return t.weight > i.weight ? t : i;
  }
  class Ti {
    constructor(t, i, s, n) {
      (this.Mo = 0),
        (this.R_ = null),
        (this.D_ = []),
        (this.wl = null),
        (this.ml = null),
        (this.E_ = new Pi()),
        (this.V_ = new Map()),
        (this.B_ = yi.T_()),
        (this.I_ = !0),
        (this.A_ = new o()),
        (this.z_ = new o()),
        (this.O_ = new o()),
        (this.L_ = null),
        (this.N_ = null),
        (this.W_ = new Map()),
        (this.F_ = -1),
        (this.H_ = []),
        (this.Ps = i),
        (this.xl = s),
        (this.U_ = i.rightOffset),
        (this.j_ = i.barSpacing),
        (this.ts = t),
        (this.o_ = n),
        this.q_(),
        this.E_.m_(i.uniformDistribution),
        this.Y_();
    }
    N() {
      return this.Ps;
    }
    K_(t) {
      _(this.xl, t), this.X_(), this.q_();
    }
    hr(t, i) {
      _(this.Ps, t),
        this.Ps.fixLeftEdge && this.Z_(),
        this.Ps.fixRightEdge && this.G_(),
        void 0 !== t.barSpacing && this.ts.dn(t.barSpacing),
        void 0 !== t.rightOffset && this.ts.fn(t.rightOffset),
        (void 0 === t.minBarSpacing && void 0 === t.maxBarSpacing) ||
          this.ts.dn(t.barSpacing ?? this.j_),
        void 0 !== t.ignoreWhitespaceIndices &&
          t.ignoreWhitespaceIndices !== this.Ps.ignoreWhitespaceIndices &&
          this.Y_(),
        this.X_(),
        this.q_(),
        this.O_.p();
    }
    Rs(t) {
      return this.D_[t]?.time ?? null;
    }
    ss(t) {
      return this.D_[t] ?? null;
    }
    J_(t, i) {
      if (this.D_.length < 1) return null;
      if (this.o_.key(t) > this.o_.key(this.D_[this.D_.length - 1].time))
        return i ? this.D_.length - 1 : null;
      const s = xt(this.D_, this.o_.key(t), (t, i) => this.o_.key(t.time) < i);
      return this.o_.key(t) < this.o_.key(this.D_[s].time) ? (i ? s : null) : s;
    }
    Ki() {
      return 0 === this.Mo || 0 === this.D_.length || null === this.R_;
    }
    Q_() {
      return this.D_.length > 0;
    }
    Pe() {
      return this.tu(), this.B_.y_();
    }
    iu() {
      return this.tu(), this.B_.k_();
    }
    su() {
      const t = this.Pe();
      if (null === t) return null;
      const i = { from: t.Uh(), to: t.bi() };
      return this.nu(i);
    }
    nu(t) {
      const i = Math.round(t.from),
        s = Math.round(t.to),
        n = a(this.eu()),
        e = a(this.ru());
      return {
        from: a(this.ss(Math.max(n, i))),
        to: a(this.ss(Math.min(e, s))),
      };
    }
    hu(t) {
      return { from: a(this.J_(t.from, !0)), to: a(this.J_(t.to, !0)) };
    }
    Qi() {
      return this.Mo;
    }
    Io(t) {
      if (!isFinite(t) || t <= 0) return;
      if (this.Mo === t) return;
      const i = this.iu(),
        s = this.Mo;
      if (
        ((this.Mo = t),
        (this.I_ = !0),
        this.Ps.lockVisibleTimeRangeOnResize && 0 !== s)
      ) {
        const i = (this.j_ * t) / s;
        this.j_ = i;
      }
      if (this.Ps.fixLeftEdge && null !== i && i.Uh() <= 0) {
        const i = s - t;
        (this.U_ -= Math.round(i / this.j_) + 1), (this.I_ = !0);
      }
      this.au(), this.lu();
    }
    jt(t) {
      if (this.Ki() || !c(t)) return 0;
      const i = this.ou() + this.U_ - t;
      return this.Mo - (i + 0.5) * this.j_ - 1;
    }
    _u(t, i) {
      const s = this.ou(),
        n = void 0 === i ? 0 : i.from,
        e = void 0 === i ? t.length : i.to;
      for (let i = n; i < e; i++) {
        const n = t[i].wt,
          e = s + this.U_ - n,
          r = this.Mo - (e + 0.5) * this.j_ - 1;
        t[i]._t = r;
      }
    }
    uu(t, i) {
      const s = Math.ceil(this.cu(t));
      return i && this.Ps.ignoreWhitespaceIndices && !this.du(s)
        ? this.fu(s)
        : s;
    }
    fn(t) {
      (this.I_ = !0), (this.U_ = t), this.lu(), this.ts.pu(), this.ts.ar();
    }
    vu() {
      return this.j_;
    }
    dn(t) {
      this.mu(t), this.lu(), this.ts.pu(), this.ts.ar();
    }
    wu() {
      return this.U_;
    }
    Ea() {
      if (this.Ki()) return null;
      if (null !== this.N_) return this.N_;
      const t = this.j_,
        i =
          ((5 * (this.ts.N().layout.fontSize + 4)) / 8) *
          (this.Ps.tickMarkMaxCharacterLength || 8),
        s = Math.round(i / t),
        n = a(this.Pe()),
        e = Math.max(n.Uh(), n.Uh() - s),
        r = Math.max(n.bi(), n.bi() - s),
        h = this.E_.M_(t, i, this.Ps.ignoreWhitespaceIndices, this.W_, this.F_),
        l = this.eu() + s,
        o = this.ru() - s,
        _ = this.gu(),
        u = this.Ps.fixLeftEdge || _,
        c = this.Ps.fixRightEdge || _;
      let d = 0;
      for (const t of h) {
        if (!(e <= t.index && t.index <= r)) continue;
        let s;
        d < this.H_.length
          ? ((s = this.H_[d]),
            (s.coord = this.jt(t.index)),
            (s.label = this.Mu(t)),
            (s.weight = t.weight))
          : ((s = {
              needAlignCoordinate: !1,
              coord: this.jt(t.index),
              label: this.Mu(t),
              weight: t.weight,
            }),
            this.H_.push(s)),
          this.j_ > i / 2 && !_
            ? (s.needAlignCoordinate = !1)
            : (s.needAlignCoordinate =
                (u && t.index <= l) || (c && t.index >= o)),
          d++;
      }
      return (this.H_.length = d), (this.N_ = this.H_), this.H_;
    }
    bu() {
      (this.I_ = !0), this.dn(this.Ps.barSpacing), this.fn(this.Ps.rightOffset);
    }
    xu(t) {
      (this.I_ = !0), (this.R_ = t), this.lu(), this.Z_();
    }
    Su(t, i) {
      const s = this.cu(t),
        n = this.vu(),
        e = n + i * (n / 10);
      this.dn(e),
        this.Ps.rightBarStaysOnScroll || this.fn(this.wu() + (s - this.cu(t)));
    }
    eo(t) {
      this.wl && this.oo(),
        null === this.ml &&
          null === this.L_ &&
          (this.Ki() || ((this.ml = t), this.Cu()));
    }
    ro(t) {
      if (null === this.L_) return;
      const i = Yt(this.Mo - t, 0, this.Mo),
        s = Yt(this.Mo - a(this.ml), 0, this.Mo);
      0 !== i && 0 !== s && this.dn((this.L_.vu * i) / s);
    }
    ho() {
      null !== this.ml && ((this.ml = null), this.Pu());
    }
    ao(t) {
      null === this.wl &&
        null === this.L_ &&
        (this.Ki() || ((this.wl = t), this.Cu()));
    }
    lo(t) {
      if (null === this.wl) return;
      const i = (this.wl - t) / this.vu();
      (this.U_ = a(this.L_).wu + i), (this.I_ = !0), this.lu();
    }
    oo() {
      null !== this.wl && ((this.wl = null), this.Pu());
    }
    yu() {
      this.ku(this.Ps.rightOffset);
    }
    ku(t, i = 400) {
      if (!isFinite(t))
        throw new RangeError('offset is required and must be finite number');
      if (!isFinite(i) || i <= 0)
        throw new RangeError(
          'animationDuration (optional) must be finite positive number',
        );
      const s = this.U_,
        n = performance.now();
      this.ts._n({
        Tu: (t) => (t - n) / i >= 1,
        Ru: (e) => {
          const r = (e - n) / i;
          return r >= 1 ? t : s + (t - s) * r;
        },
      });
    }
    yt(t, i) {
      (this.I_ = !0), (this.D_ = t), this.E_.w_(t, i), this.lu();
    }
    Du() {
      return this.A_;
    }
    Eu() {
      return this.z_;
    }
    Vu() {
      return this.O_;
    }
    ou() {
      return this.R_ || 0;
    }
    Bu(t) {
      const i = t.f_();
      this.mu(this.Mo / i),
        (this.U_ = t.bi() - this.ou()),
        this.lu(),
        (this.I_ = !0),
        this.ts.pu(),
        this.ts.ar();
    }
    Iu() {
      const t = this.eu(),
        i = this.ru();
      null !== t && null !== i && this.Bu(new Si(t, i + this.Ps.rightOffset));
    }
    Au(t) {
      const i = new Si(t.from, t.to);
      this.Bu(i);
    }
    ns(t) {
      return void 0 !== this.xl.timeFormatter
        ? this.xl.timeFormatter(t.originalTime)
        : this.o_.formatHorzItem(t.time);
    }
    Y_() {
      if (!this.Ps.ignoreWhitespaceIndices) return;
      this.W_.clear();
      const t = this.ts.Ys();
      for (const i of t) for (const t of i.ma()) this.W_.set(t, !0);
      this.F_++;
    }
    gu() {
      const t = this.ts.N().handleScroll,
        i = this.ts.N().handleScale;
      return !(
        t.horzTouchDrag ||
        t.mouseWheel ||
        t.pressedMouseMove ||
        t.vertTouchDrag ||
        i.axisDoubleClickReset.time ||
        i.axisPressedMouseMove.time ||
        i.mouseWheel ||
        i.pinch
      );
    }
    eu() {
      return 0 === this.D_.length ? null : 0;
    }
    ru() {
      return 0 === this.D_.length ? null : this.D_.length - 1;
    }
    zu(t) {
      return (this.Mo - 1 - t) / this.j_;
    }
    cu(t) {
      const i = this.zu(t),
        s = this.ou() + this.U_ - i;
      return Math.round(1e6 * s) / 1e6;
    }
    mu(t) {
      const i = this.j_;
      (this.j_ = t), this.au(), i !== this.j_ && ((this.I_ = !0), this.Ou());
    }
    tu() {
      if (!this.I_) return;
      if (((this.I_ = !1), this.Ki())) return void this.Lu(yi.T_());
      const t = this.ou(),
        i = this.Mo / this.j_,
        s = this.U_ + t,
        n = new Si(s - i + 1, s);
      this.Lu(new yi(n));
    }
    au() {
      const t = Yt(this.j_, this.Nu(), this.Wu());
      this.j_ !== t && ((this.j_ = t), (this.I_ = !0));
    }
    Wu() {
      return this.Ps.maxBarSpacing > 0 ? this.Ps.maxBarSpacing : 0.5 * this.Mo;
    }
    Nu() {
      return this.Ps.fixLeftEdge && this.Ps.fixRightEdge && 0 !== this.D_.length
        ? this.Mo / this.D_.length
        : this.Ps.minBarSpacing;
    }
    lu() {
      const t = this.Fu();
      null !== t && this.U_ < t && ((this.U_ = t), (this.I_ = !0));
      const i = this.Hu();
      this.U_ > i && ((this.U_ = i), (this.I_ = !0));
    }
    Fu() {
      const t = this.eu(),
        i = this.R_;
      if (null === t || null === i) return null;
      return (
        t -
        i -
        1 +
        (this.Ps.fixLeftEdge ? this.Mo / this.j_ : Math.min(2, this.D_.length))
      );
    }
    Hu() {
      return this.Ps.fixRightEdge
        ? 0
        : this.Mo / this.j_ - Math.min(2, this.D_.length);
    }
    Cu() {
      this.L_ = { vu: this.vu(), wu: this.wu() };
    }
    Pu() {
      this.L_ = null;
    }
    Mu(t) {
      let i = this.V_.get(t.weight);
      return (
        void 0 === i &&
          ((i = new xi((t) => this.Uu(t), this.o_)), this.V_.set(t.weight, i)),
        i.__(t)
      );
    }
    Uu(t) {
      return this.o_.formatTickmark(t, this.xl);
    }
    Lu(t) {
      const i = this.B_;
      (this.B_ = t),
        Ci(i.y_(), this.B_.y_()) || this.A_.p(),
        Ci(i.k_(), this.B_.k_()) || this.z_.p(),
        this.Ou();
    }
    Ou() {
      this.N_ = null;
    }
    X_() {
      this.Ou(), this.V_.clear();
    }
    q_() {
      this.o_.updateFormatter(this.xl);
    }
    Z_() {
      if (!this.Ps.fixLeftEdge) return;
      const t = this.eu();
      if (null === t) return;
      const i = this.Pe();
      if (null === i) return;
      const s = i.Uh() - t;
      if (s < 0) {
        const t = this.U_ - s - 1;
        this.fn(t);
      }
      this.au();
    }
    G_() {
      this.lu(), this.au();
    }
    du(t) {
      return !this.Ps.ignoreWhitespaceIndices || this.W_.get(t) || !1;
    }
    fu(t) {
      const i = (function* (t) {
          const i = Math.round(t),
            s = i < t;
          let n = 1;
          for (;;)
            s ? (yield i + n, yield i - n) : (yield i - n, yield i + n), n++;
        })(t),
        s = this.ru();
      for (; s; ) {
        const t = i.next().value;
        if (this.W_.get(t)) return t;
        if (t < 0 || t > s) break;
      }
      return t;
    }
  }
  var Ri, Di, Ei, Vi, Bi;
  !(function (t) {
    (t[(t.OnTouchEnd = 0)] = 'OnTouchEnd'),
      (t[(t.OnNextTap = 1)] = 'OnNextTap');
  })(Ri || (Ri = {}));
  class Ii {
    constructor(t, i, s) {
      (this.$u = []),
        (this.ju = []),
        (this.Mo = 0),
        (this.qu = null),
        (this.Yu = new o()),
        (this.Ku = new o()),
        (this.Xu = null),
        (this.Zu = t),
        (this.Ps = i),
        (this.o_ = s),
        (this.Sl = new S(this.Ps.layout.colorParsers)),
        (this.Gu = new M(this)),
        (this.uh = new Ti(this, i.timeScale, this.Ps.localization, s)),
        (this.Ct = new j(this, i.crosshair)),
        (this.Ju = new qt(i.crosshair)),
        i.addDefaultPane && (this.Qu(0), this.$u[0].Bo(2)),
        (this.tc = this.sc(0)),
        (this.nc = this.sc(1));
    }
    Bh() {
      this.ec(Y.gn());
    }
    ar() {
      this.ec(Y.wn());
    }
    Zh() {
      this.ec(new Y(1));
    }
    Ih(t) {
      const i = this.rc(t);
      this.ec(i);
    }
    hc() {
      return this.qu;
    }
    ac(t) {
      if (this.qu?.n_ === t?.n_ && this.qu?.e_?.Kn === t?.e_?.Kn) return;
      const i = this.qu;
      (this.qu = t),
        null !== i && this.Ih(i.n_),
        null !== t && t.n_ !== i?.n_ && this.Ih(t.n_);
    }
    N() {
      return this.Ps;
    }
    hr(t) {
      _(this.Ps, t),
        this.$u.forEach((i) => i.Ro(t)),
        void 0 !== t.timeScale && this.uh.hr(t.timeScale),
        void 0 !== t.localization && this.uh.K_(t.localization),
        (t.leftPriceScale || t.rightPriceScale) && this.Yu.p(),
        (this.tc = this.sc(0)),
        (this.nc = this.sc(1)),
        this.Bh();
    }
    lc(t, i, s = 0) {
      const n = this.$u[s];
      if (void 0 === n) return;
      if ('left' === t)
        return (
          _(this.Ps, { leftPriceScale: i }),
          n.Ro({ leftPriceScale: i }),
          this.Yu.p(),
          void this.Bh()
        );
      if ('right' === t)
        return (
          _(this.Ps, { rightPriceScale: i }),
          n.Ro({ rightPriceScale: i }),
          this.Yu.p(),
          void this.Bh()
        );
      const e = this.oc(t, s);
      null !== e && (e.Wt.hr(i), this.Yu.p());
    }
    oc(t, i) {
      const s = this.$u[i];
      if (void 0 === s) return null;
      const n = s.Do(t);
      return null !== n ? { Us: s, Wt: n } : null;
    }
    It() {
      return this.uh;
    }
    $s() {
      return this.$u;
    }
    _c() {
      return this.Ct;
    }
    uc() {
      return this.Ku;
    }
    cc(t, i) {
      t.zl(i), this.pu();
    }
    Io(t) {
      (this.Mo = t),
        this.uh.Io(this.Mo),
        this.$u.forEach((i) => i.Io(t)),
        this.pu();
    }
    dc(t) {
      1 !== this.$u.length &&
        (r(t >= 0 && t < this.$u.length, 'Invalid pane index'),
        this.$u.splice(t, 1),
        this.Bh());
    }
    fc(t, i) {
      if (this.$u.length < 2) return;
      r(t >= 0 && t < this.$u.length, 'Invalid pane index');
      const s = this.$u[t],
        n = this.$u.reduce((t, i) => t + i.Vo(), 0),
        e = this.$u.reduce((t, i) => t + i.$t(), 0),
        h = e - 30 * (this.$u.length - 1);
      i = Math.min(h, Math.max(30, i));
      const a = n / e,
        l = s.$t();
      s.Bo(i * a);
      let o = i - l,
        _ = this.$u.length - 1;
      for (const t of this.$u)
        if (t !== s) {
          const i = Math.min(h, Math.max(30, t.$t() - o / _));
          (o -= t.$t() - i), (_ -= 1);
          const s = i * a;
          t.Bo(s);
        }
      this.Bh();
    }
    vc(t, i) {
      r(
        t >= 0 && t < this.$u.length && i >= 0 && i < this.$u.length,
        'Invalid pane index',
      );
      const s = this.$u[t],
        n = this.$u[i];
      (this.$u[t] = n), (this.$u[i] = s), this.Bh();
    }
    mc(t, i) {
      if (
        (r(
          t >= 0 && t < this.$u.length && i >= 0 && i < this.$u.length,
          'Invalid pane index',
        ),
        t === i)
      )
        return;
      const [s] = this.$u.splice(t, 1);
      this.$u.splice(i, 0, s), this.Bh();
    }
    Uo(t, i, s) {
      t.Uo(i, s);
    }
    $o(t, i, s) {
      t.$o(i, s), this.Ah(), this.ec(this.wc(t, 2));
    }
    jo(t, i) {
      t.jo(i), this.ec(this.wc(t, 2));
    }
    qo(t, i, s) {
      i.Rl() || t.qo(i, s);
    }
    Yo(t, i, s) {
      i.Rl() || (t.Yo(i, s), this.Ah(), this.ec(this.wc(t, 2)));
    }
    Ko(t, i) {
      i.Rl() || (t.Ko(i), this.ec(this.wc(t, 2)));
    }
    Zo(t, i) {
      t.Zo(i), this.ec(this.wc(t, 2));
    }
    gc(t) {
      this.uh.eo(t);
    }
    Mc(t, i) {
      const s = this.It();
      if (s.Ki() || 0 === i) return;
      const n = s.Qi();
      (t = Math.max(1, Math.min(t, n))), s.Su(t, i), this.pu();
    }
    bc(t) {
      this.xc(0), this.Sc(t), this.Cc();
    }
    Pc(t) {
      this.uh.ro(t), this.pu();
    }
    yc() {
      this.uh.ho(), this.ar();
    }
    xc(t) {
      this.uh.ao(t);
    }
    Sc(t) {
      this.uh.lo(t), this.pu();
    }
    Cc() {
      this.uh.oo(), this.ar();
    }
    Ys() {
      return this.ju;
    }
    kc(t, i, s, n, e) {
      this.Ct.Es(t, i);
      let r = NaN,
        h = this.uh.uu(t, !0);
      const a = this.uh.Pe();
      null !== a && (h = Math.min(Math.max(a.Uh(), h), a.bi()));
      const l = n.ks(),
        o = l.zt();
      if (
        (null !== o && (r = l.Ts(i, o)),
        (r = this.Ju.Ma(r, h, n)),
        this.Ct.As(h, r, n),
        this.Zh(),
        !e)
      ) {
        const e = bi(n, t, i);
        this.ac(e && { n_: e.n_, e_: e.e_, h_: e.h_ || null }),
          this.Ku.p(this.Ct.Bt(), { x: t, y: i }, s);
      }
    }
    Tc(t, i, s) {
      const n = s.ks(),
        e = n.zt(),
        r = n.Nt(t, a(e)),
        h = this.uh.J_(i, !0),
        l = this.uh.jt(a(h));
      this.kc(l, r, null, s, !0);
    }
    Rc(t) {
      this._c().Os(), this.Zh(), t || this.Ku.p(null, null, null);
    }
    Ah() {
      const t = this.Ct.Us();
      if (null !== t) {
        const i = this.Ct.Bs(),
          s = this.Ct.Is();
        this.kc(i, s, null, t);
      }
      this.Ct.Ns();
    }
    Dc(t, i, s) {
      const n = this.uh.Rs(0);
      void 0 !== i && void 0 !== s && this.uh.yt(i, s);
      const e = this.uh.Rs(0),
        r = this.uh.ou(),
        h = this.uh.Pe();
      if (null !== h && null !== n && null !== e) {
        const i = h.Te(r),
          a = this.o_.key(n) > this.o_.key(e),
          l = null !== t && t > r && !a,
          o = this.uh.N().allowShiftVisibleRangeOnWhitespaceReplacement,
          _ =
            i &&
            (!(void 0 === s) || o) &&
            this.uh.N().shiftVisibleRangeOnNewBar;
        if (l && !_) {
          const i = t - r;
          this.uh.fn(this.uh.wu() - i);
        }
      }
      this.uh.xu(t);
    }
    Oh(t) {
      null !== t && t.Jo();
    }
    Hn(t) {
      if (
        (function (t) {
          return t instanceof mi;
        })(t)
      )
        return t;
      const i = this.$u.find((i) => i.Dt().includes(t));
      return void 0 === i ? null : i;
    }
    pu() {
      this.$u.forEach((t) => t.Jo()), this.Ah();
    }
    m() {
      this.$u.forEach((t) => t.m()),
        (this.$u.length = 0),
        (this.Ps.localization.priceFormatter = void 0),
        (this.Ps.localization.percentageFormatter = void 0),
        (this.Ps.localization.timeFormatter = void 0);
    }
    Ec() {
      return this.Gu;
    }
    qn() {
      return this.Gu.N();
    }
    Eo() {
      return this.Yu;
    }
    Vc(t, i) {
      const s = this.Qu(i);
      this.Bc(t, s),
        this.ju.push(t),
        1 === this.ju.length ? this.Bh() : this.ar();
    }
    Ic(t) {
      const i = this.Hn(t),
        s = this.ju.indexOf(t);
      r(-1 !== s, 'Series not found');
      const n = a(i);
      this.ju.splice(s, 1), n.io(t), t.m && t.m(), this.uh.Y_(), this.Ac(n);
    }
    Vh(t, i) {
      const s = a(this.Hn(t));
      s.io(t, !0), s.Jl(t, i, !0);
    }
    Iu() {
      const t = Y.wn();
      t.rn(), this.ec(t);
    }
    zc(t) {
      const i = Y.wn();
      i.ln(t), this.ec(i);
    }
    cn() {
      const t = Y.wn();
      t.cn(), this.ec(t);
    }
    dn(t) {
      const i = Y.wn();
      i.dn(t), this.ec(i);
    }
    fn(t) {
      const i = Y.wn();
      i.fn(t), this.ec(i);
    }
    _n(t) {
      const i = Y.wn();
      i._n(t), this.ec(i);
    }
    hn() {
      const t = Y.wn();
      t.hn(), this.ec(t);
    }
    Oc() {
      return this.Ps.rightPriceScale.visible ? 'right' : 'left';
    }
    Lc(t, i) {
      r(i >= 0, 'Index should be greater or equal to 0');
      if (i === this.Nc(t)) return;
      const s = a(this.Hn(t));
      s.io(t);
      const n = this.Qu(i);
      this.Bc(t, n), 0 === s.ba().length && this.Ac(s), this.Bh();
    }
    Wc() {
      return this.nc;
    }
    $() {
      return this.tc;
    }
    Ut(t) {
      const i = this.nc,
        s = this.tc;
      if (i === s) return i;
      if (
        ((t = Math.max(0, Math.min(100, Math.round(100 * t)))),
        null === this.Xu || this.Xu.mr !== s || this.Xu.wr !== i)
      )
        this.Xu = { mr: s, wr: i, Fc: new Map() };
      else {
        const i = this.Xu.Fc.get(t);
        if (void 0 !== i) return i;
      }
      const n = this.Sl.tt(s, i, t / 100);
      return this.Xu.Fc.set(t, n), n;
    }
    Hc(t) {
      return this.$u.indexOf(t);
    }
    Xi() {
      return this.Sl;
    }
    Uc() {
      return this.$c();
    }
    $c(t) {
      const i = new mi(this.uh, this);
      this.$u.push(i);
      const s = t ?? this.$u.length - 1,
        n = Y.gn();
      return n.Qs(s, { tn: 0, sn: !0 }), this.ec(n), i;
    }
    Qu(t) {
      return (
        r(t >= 0, 'Index should be greater or equal to 0'),
        (t = Math.min(this.$u.length, t)) < this.$u.length
          ? this.$u[t]
          : this.$c(t)
      );
    }
    Nc(t) {
      return this.$u.findIndex((i) => i.Lo().includes(t));
    }
    wc(t, i) {
      const s = new Y(i);
      if (null !== t) {
        const n = this.$u.indexOf(t);
        s.Qs(n, { tn: i });
      }
      return s;
    }
    rc(t, i) {
      return void 0 === i && (i = 2), this.wc(this.Hn(t), i);
    }
    ec(t) {
      this.Zu && this.Zu(t), this.$u.forEach((t) => t.i_().lr().yt());
    }
    Bc(t, i) {
      const s = t.N().priceScaleId,
        n = void 0 !== s ? s : this.Oc();
      i.Jl(t, n), q(n) || t.hr(t.N());
    }
    sc(t) {
      const i = this.Ps.layout;
      return 'gradient' === i.background.type
        ? 0 === t
          ? i.background.topColor
          : i.background.bottomColor
        : i.background.color;
    }
    Ac(t) {
      !t.Oo() &&
        0 === t.ba().length &&
        this.$u.length > 1 &&
        this.$u.splice(this.Hc(t), 1);
    }
  }
  function Ai(t) {
    return !u(t) && !d(t);
  }
  function zi(t) {
    return u(t);
  }
  !(function (t) {
    (t[(t.Disabled = 0)] = 'Disabled'),
      (t[(t.Continuous = 1)] = 'Continuous'),
      (t[(t.OnDataUpdate = 2)] = 'OnDataUpdate');
  })(Di || (Di = {})),
    (function (t) {
      (t[(t.LastBar = 0)] = 'LastBar'),
        (t[(t.LastVisible = 1)] = 'LastVisible');
    })(Ei || (Ei = {})),
    (function (t) {
      (t.Solid = 'solid'), (t.VerticalGradient = 'gradient');
    })(Vi || (Vi = {})),
    (function (t) {
      (t[(t.Year = 0)] = 'Year'),
        (t[(t.Month = 1)] = 'Month'),
        (t[(t.DayOfMonth = 2)] = 'DayOfMonth'),
        (t[(t.Time = 3)] = 'Time'),
        (t[(t.TimeWithSeconds = 4)] = 'TimeWithSeconds');
    })(Bi || (Bi = {}));
  const Oi = (t) => t.getUTCFullYear();
  function Li(t, i, s) {
    return i
      .replace(/yyyy/g, ((t) => Z(Oi(t), 4))(t))
      .replace(/yy/g, ((t) => Z(Oi(t) % 100, 2))(t))
      .replace(
        /MMMM/g,
        ((t, i) =>
          new Date(t.getUTCFullYear(), t.getUTCMonth(), 1).toLocaleString(i, {
            month: 'long',
          }))(t, s),
      )
      .replace(
        /MMM/g,
        ((t, i) =>
          new Date(t.getUTCFullYear(), t.getUTCMonth(), 1).toLocaleString(i, {
            month: 'short',
          }))(t, s),
      )
      .replace(/MM/g, ((t) => Z(((t) => t.getUTCMonth() + 1)(t), 2))(t))
      .replace(/dd/g, ((t) => Z(((t) => t.getUTCDate())(t), 2))(t));
  }
  class Ni {
    constructor(t = 'yyyy-MM-dd', i = 'default') {
      (this.jc = t), (this.qc = i);
    }
    __(t) {
      return Li(t, this.jc, this.qc);
    }
  }
  class Wi {
    constructor(t) {
      this.Yc = t || '%h:%m:%s';
    }
    __(t) {
      return this.Yc.replace('%h', Z(t.getUTCHours(), 2))
        .replace('%m', Z(t.getUTCMinutes(), 2))
        .replace('%s', Z(t.getUTCSeconds(), 2));
    }
  }
  const Fi = { Kc: 'yyyy-MM-dd', Xc: '%h:%m:%s', Zc: ' ', Gc: 'default' };
  class Hi {
    constructor(t = {}) {
      const i = { ...Fi, ...t };
      (this.Jc = new Ni(i.Kc, i.Gc)),
        (this.Qc = new Wi(i.Xc)),
        (this.td = i.Zc);
    }
    __(t) {
      return `${this.Jc.__(t)}${this.td}${this.Qc.__(t)}`;
    }
  }
  function Ui(t) {
    return 60 * t * 60 * 1e3;
  }
  function $i(t) {
    return 60 * t * 1e3;
  }
  const ji = [
    { sd: ((qi = 1), 1e3 * qi), nd: 10 },
    { sd: $i(1), nd: 20 },
    { sd: $i(5), nd: 21 },
    { sd: $i(30), nd: 22 },
    { sd: Ui(1), nd: 30 },
    { sd: Ui(3), nd: 31 },
    { sd: Ui(6), nd: 32 },
    { sd: Ui(12), nd: 33 },
  ];
  var qi;
  function Yi(t, i) {
    if (t.getUTCFullYear() !== i.getUTCFullYear()) return 70;
    if (t.getUTCMonth() !== i.getUTCMonth()) return 60;
    if (t.getUTCDate() !== i.getUTCDate()) return 50;
    for (let s = ji.length - 1; s >= 0; --s)
      if (
        Math.floor(i.getTime() / ji[s].sd) !==
        Math.floor(t.getTime() / ji[s].sd)
      )
        return ji[s].nd;
    return 0;
  }
  function Ki(t) {
    let i = t;
    if ((d(t) && (i = Zi(t)), !Ai(i)))
      throw new Error('time must be of type BusinessDay');
    const s = new Date(Date.UTC(i.year, i.month - 1, i.day, 0, 0, 0, 0));
    return { ed: Math.round(s.getTime() / 1e3), rd: i };
  }
  function Xi(t) {
    if (!zi(t)) throw new Error('time must be of type isUTCTimestamp');
    return { ed: t };
  }
  function Zi(t) {
    const i = new Date(t);
    if (isNaN(i.getTime()))
      throw new Error(`Invalid date string=${t}, expected format=yyyy-mm-dd`);
    return {
      day: i.getUTCDate(),
      month: i.getUTCMonth() + 1,
      year: i.getUTCFullYear(),
    };
  }
  function Gi(t) {
    d(t.time) && (t.time = Zi(t.time));
  }
  class Ji {
    options() {
      return this.Ps;
    }
    setOptions(t) {
      (this.Ps = t), this.updateFormatter(t.localization);
    }
    preprocessData(t) {
      Array.isArray(t)
        ? (function (t) {
            t.forEach(Gi);
          })(t)
        : Gi(t);
    }
    createConverterToInternalObj(t) {
      return a(
        (function (t) {
          return 0 === t.length
            ? null
            : Ai(t[0].time) || d(t[0].time)
            ? Ki
            : Xi;
        })(t),
      );
    }
    key(t) {
      return 'object' == typeof t && 'ed' in t
        ? t.ed
        : this.key(this.convertHorzItemToInternal(t));
    }
    cacheKey(t) {
      const i = t;
      return void 0 === i.rd
        ? new Date(1e3 * i.ed).getTime()
        : new Date(Date.UTC(i.rd.year, i.rd.month - 1, i.rd.day)).getTime();
    }
    convertHorzItemToInternal(t) {
      return zi((i = t)) ? Xi(i) : Ai(i) ? Ki(i) : Ki(Zi(i));
      var i;
    }
    updateFormatter(t) {
      if (!this.Ps) return;
      const i = t.dateFormat;
      this.Ps.timeScale.timeVisible
        ? (this.hd = new Hi({
            Kc: i,
            Xc: this.Ps.timeScale.secondsVisible ? '%h:%m:%s' : '%h:%m',
            Zc: '   ',
            Gc: t.locale,
          }))
        : (this.hd = new Ni(i, t.locale));
    }
    formatHorzItem(t) {
      const i = t;
      return this.hd.__(new Date(1e3 * i.ed));
    }
    formatTickmark(t, i) {
      const s = (function (t, i, s) {
          switch (t) {
            case 0:
            case 10:
              return i ? (s ? 4 : 3) : 2;
            case 20:
            case 21:
            case 22:
            case 30:
            case 31:
            case 32:
            case 33:
              return i ? 3 : 2;
            case 50:
              return 2;
            case 60:
              return 1;
            case 70:
              return 0;
          }
        })(
          t.weight,
          this.Ps.timeScale.timeVisible,
          this.Ps.timeScale.secondsVisible,
        ),
        n = this.Ps.timeScale;
      if (void 0 !== n.tickMarkFormatter) {
        const e = n.tickMarkFormatter(t.originalTime, s, i.locale);
        if (null !== e) return e;
      }
      return (function (t, i, s) {
        const n = {};
        switch (i) {
          case 0:
            n.year = 'numeric';
            break;
          case 1:
            n.month = 'short';
            break;
          case 2:
            n.day = 'numeric';
            break;
          case 3:
            (n.hour12 = !1), (n.hour = '2-digit'), (n.minute = '2-digit');
            break;
          case 4:
            (n.hour12 = !1),
              (n.hour = '2-digit'),
              (n.minute = '2-digit'),
              (n.second = '2-digit');
        }
        const e =
          void 0 === t.rd
            ? new Date(1e3 * t.ed)
            : new Date(Date.UTC(t.rd.year, t.rd.month - 1, t.rd.day));
        return new Date(
          e.getUTCFullYear(),
          e.getUTCMonth(),
          e.getUTCDate(),
          e.getUTCHours(),
          e.getUTCMinutes(),
          e.getUTCSeconds(),
          e.getUTCMilliseconds(),
        ).toLocaleString(s, n);
      })(t.time, s, i.locale);
    }
    maxTickMarkWeight(t) {
      let i = t.reduce(ki, t[0]).weight;
      return i > 30 && i < 50 && (i = 30), i;
    }
    fillWeightsForPoints(t, i) {
      !(function (t, i = 0) {
        if (0 === t.length) return;
        let s = 0 === i ? null : t[i - 1].time.ed,
          n = null !== s ? new Date(1e3 * s) : null,
          e = 0;
        for (let r = i; r < t.length; ++r) {
          const i = t[r],
            h = new Date(1e3 * i.time.ed);
          null !== n && (i.timeWeight = Yi(h, n)),
            (e += i.time.ed - (s || i.time.ed)),
            (s = i.time.ed),
            (n = h);
        }
        if (0 === i && t.length > 1) {
          const i = Math.ceil(e / (t.length - 1)),
            s = new Date(1e3 * (t[0].time.ed - i));
          t[0].timeWeight = Yi(new Date(1e3 * t[0].time.ed), s);
        }
      })(t, i);
    }
    static ad(t) {
      return _({ localization: { dateFormat: "dd MMM 'yy" } }, t ?? {});
    }
  }
  function Qi(t) {
    var i = t.width,
      s = t.height;
    if (i < 0) throw new Error('Negative width is not allowed for Size');
    if (s < 0) throw new Error('Negative height is not allowed for Size');
    return { width: i, height: s };
  }
  function ts(t, i) {
    return t.width === i.width && t.height === i.height;
  }
  var is = (function () {
    function t(t) {
      var i = this;
      (this._resolutionListener = function () {
        return i._onResolutionChanged();
      }),
        (this._resolutionMediaQueryList = null),
        (this._observers = []),
        (this._window = t),
        this._installResolutionListener();
    }
    return (
      (t.prototype.dispose = function () {
        this._uninstallResolutionListener(), (this._window = null);
      }),
      Object.defineProperty(t.prototype, 'value', {
        get: function () {
          return this._window.devicePixelRatio;
        },
        enumerable: !1,
        configurable: !0,
      }),
      (t.prototype.subscribe = function (t) {
        var i = this,
          s = { next: t };
        return (
          this._observers.push(s),
          {
            unsubscribe: function () {
              i._observers = i._observers.filter(function (t) {
                return t !== s;
              });
            },
          }
        );
      }),
      (t.prototype._installResolutionListener = function () {
        if (null !== this._resolutionMediaQueryList)
          throw new Error('Resolution listener is already installed');
        var t = this._window.devicePixelRatio;
        (this._resolutionMediaQueryList = this._window.matchMedia(
          'all and (resolution: '.concat(t, 'dppx)'),
        )),
          this._resolutionMediaQueryList.addListener(this._resolutionListener);
      }),
      (t.prototype._uninstallResolutionListener = function () {
        null !== this._resolutionMediaQueryList &&
          (this._resolutionMediaQueryList.removeListener(
            this._resolutionListener,
          ),
          (this._resolutionMediaQueryList = null));
      }),
      (t.prototype._reinstallResolutionListener = function () {
        this._uninstallResolutionListener(), this._installResolutionListener();
      }),
      (t.prototype._onResolutionChanged = function () {
        var t = this;
        this._observers.forEach(function (i) {
          return i.next(t._window.devicePixelRatio);
        }),
          this._reinstallResolutionListener();
      }),
      t
    );
  })();
  var ss = (function () {
    function t(t, i, s) {
      var n;
      (this._canvasElement = null),
        (this._bitmapSizeChangedListeners = []),
        (this._suggestedBitmapSize = null),
        (this._suggestedBitmapSizeChangedListeners = []),
        (this._devicePixelRatioObservable = null),
        (this._canvasElementResizeObserver = null),
        (this._canvasElement = t),
        (this._canvasElementClientSize = Qi({
          width: this._canvasElement.clientWidth,
          height: this._canvasElement.clientHeight,
        })),
        (this._transformBitmapSize =
          null != i
            ? i
            : function (t) {
                return t;
              }),
        (this._allowResizeObserver =
          null === (n = null == s ? void 0 : s.allowResizeObserver) ||
          void 0 === n ||
          n),
        this._chooseAndInitObserver();
    }
    return (
      (t.prototype.dispose = function () {
        var t, i;
        if (null === this._canvasElement) throw new Error('Object is disposed');
        null === (t = this._canvasElementResizeObserver) ||
          void 0 === t ||
          t.disconnect(),
          (this._canvasElementResizeObserver = null),
          null === (i = this._devicePixelRatioObservable) ||
            void 0 === i ||
            i.dispose(),
          (this._devicePixelRatioObservable = null),
          (this._suggestedBitmapSizeChangedListeners.length = 0),
          (this._bitmapSizeChangedListeners.length = 0),
          (this._canvasElement = null);
      }),
      Object.defineProperty(t.prototype, 'canvasElement', {
        get: function () {
          if (null === this._canvasElement)
            throw new Error('Object is disposed');
          return this._canvasElement;
        },
        enumerable: !1,
        configurable: !0,
      }),
      Object.defineProperty(t.prototype, 'canvasElementClientSize', {
        get: function () {
          return this._canvasElementClientSize;
        },
        enumerable: !1,
        configurable: !0,
      }),
      Object.defineProperty(t.prototype, 'bitmapSize', {
        get: function () {
          return Qi({
            width: this.canvasElement.width,
            height: this.canvasElement.height,
          });
        },
        enumerable: !1,
        configurable: !0,
      }),
      (t.prototype.resizeCanvasElement = function (t) {
        (this._canvasElementClientSize = Qi(t)),
          (this.canvasElement.style.width = ''.concat(
            this._canvasElementClientSize.width,
            'px',
          )),
          (this.canvasElement.style.height = ''.concat(
            this._canvasElementClientSize.height,
            'px',
          )),
          this._invalidateBitmapSize();
      }),
      (t.prototype.subscribeBitmapSizeChanged = function (t) {
        this._bitmapSizeChangedListeners.push(t);
      }),
      (t.prototype.unsubscribeBitmapSizeChanged = function (t) {
        this._bitmapSizeChangedListeners =
          this._bitmapSizeChangedListeners.filter(function (i) {
            return i !== t;
          });
      }),
      Object.defineProperty(t.prototype, 'suggestedBitmapSize', {
        get: function () {
          return this._suggestedBitmapSize;
        },
        enumerable: !1,
        configurable: !0,
      }),
      (t.prototype.subscribeSuggestedBitmapSizeChanged = function (t) {
        this._suggestedBitmapSizeChangedListeners.push(t);
      }),
      (t.prototype.unsubscribeSuggestedBitmapSizeChanged = function (t) {
        this._suggestedBitmapSizeChangedListeners =
          this._suggestedBitmapSizeChangedListeners.filter(function (i) {
            return i !== t;
          });
      }),
      (t.prototype.applySuggestedBitmapSize = function () {
        if (null !== this._suggestedBitmapSize) {
          var t = this._suggestedBitmapSize;
          (this._suggestedBitmapSize = null),
            this._resizeBitmap(t),
            this._emitSuggestedBitmapSizeChanged(t, this._suggestedBitmapSize);
        }
      }),
      (t.prototype._resizeBitmap = function (t) {
        var i = this.bitmapSize;
        ts(i, t) ||
          ((this.canvasElement.width = t.width),
          (this.canvasElement.height = t.height),
          this._emitBitmapSizeChanged(i, t));
      }),
      (t.prototype._emitBitmapSizeChanged = function (t, i) {
        var s = this;
        this._bitmapSizeChangedListeners.forEach(function (n) {
          return n.call(s, t, i);
        });
      }),
      (t.prototype._suggestNewBitmapSize = function (t) {
        var i = this._suggestedBitmapSize,
          s = Qi(this._transformBitmapSize(t, this._canvasElementClientSize)),
          n = ts(this.bitmapSize, s) ? null : s;
        (null === i && null === n) ||
          (null !== i && null !== n && ts(i, n)) ||
          ((this._suggestedBitmapSize = n),
          this._emitSuggestedBitmapSizeChanged(i, n));
      }),
      (t.prototype._emitSuggestedBitmapSizeChanged = function (t, i) {
        var s = this;
        this._suggestedBitmapSizeChangedListeners.forEach(function (n) {
          return n.call(s, t, i);
        });
      }),
      (t.prototype._chooseAndInitObserver = function () {
        var t = this;
        this._allowResizeObserver
          ? new Promise(function (t) {
              var i = new ResizeObserver(function (s) {
                t(
                  s.every(function (t) {
                    return 'devicePixelContentBoxSize' in t;
                  }),
                ),
                  i.disconnect();
              });
              i.observe(document.body, { box: 'device-pixel-content-box' });
            })
              .catch(function () {
                return !1;
              })
              .then(function (i) {
                return i
                  ? t._initResizeObserver()
                  : t._initDevicePixelRatioObservable();
              })
          : this._initDevicePixelRatioObservable();
      }),
      (t.prototype._initDevicePixelRatioObservable = function () {
        var t = this;
        if (null !== this._canvasElement) {
          var i = ns(this._canvasElement);
          if (null === i)
            throw new Error('No window is associated with the canvas');
          (this._devicePixelRatioObservable = (function (t) {
            return new is(t);
          })(i)),
            this._devicePixelRatioObservable.subscribe(function () {
              return t._invalidateBitmapSize();
            }),
            this._invalidateBitmapSize();
        }
      }),
      (t.prototype._invalidateBitmapSize = function () {
        var t, i;
        if (null !== this._canvasElement) {
          var s = ns(this._canvasElement);
          if (null !== s) {
            var n =
                null !==
                  (i =
                    null === (t = this._devicePixelRatioObservable) ||
                    void 0 === t
                      ? void 0
                      : t.value) && void 0 !== i
                  ? i
                  : s.devicePixelRatio,
              e = this._canvasElement.getClientRects(),
              r =
                void 0 !== e[0]
                  ? (function (t, i) {
                      return Qi({
                        width:
                          Math.round(t.left * i + t.width * i) -
                          Math.round(t.left * i),
                        height:
                          Math.round(t.top * i + t.height * i) -
                          Math.round(t.top * i),
                      });
                    })(e[0], n)
                  : Qi({
                      width: this._canvasElementClientSize.width * n,
                      height: this._canvasElementClientSize.height * n,
                    });
            this._suggestNewBitmapSize(r);
          }
        }
      }),
      (t.prototype._initResizeObserver = function () {
        var t = this;
        null !== this._canvasElement &&
          ((this._canvasElementResizeObserver = new ResizeObserver(function (
            i,
          ) {
            var s = i.find(function (i) {
              return i.target === t._canvasElement;
            });
            if (
              s &&
              s.devicePixelContentBoxSize &&
              s.devicePixelContentBoxSize[0]
            ) {
              var n = s.devicePixelContentBoxSize[0],
                e = Qi({ width: n.inlineSize, height: n.blockSize });
              t._suggestNewBitmapSize(e);
            }
          })),
          this._canvasElementResizeObserver.observe(this._canvasElement, {
            box: 'device-pixel-content-box',
          }));
      }),
      t
    );
  })();
  function ns(t) {
    return t.ownerDocument.defaultView;
  }
  var es = (function () {
    function t(t, i, s) {
      if (0 === i.width || 0 === i.height)
        throw new TypeError(
          'Rendering target could only be created on a media with positive width and height',
        );
      if (((this._mediaSize = i), 0 === s.width || 0 === s.height))
        throw new TypeError(
          'Rendering target could only be created using a bitmap with positive integer width and height',
        );
      (this._bitmapSize = s), (this._context = t);
    }
    return (
      (t.prototype.useMediaCoordinateSpace = function (t) {
        try {
          return (
            this._context.save(),
            this._context.setTransform(1, 0, 0, 1, 0, 0),
            this._context.scale(
              this._horizontalPixelRatio,
              this._verticalPixelRatio,
            ),
            t({ context: this._context, mediaSize: this._mediaSize })
          );
        } finally {
          this._context.restore();
        }
      }),
      (t.prototype.useBitmapCoordinateSpace = function (t) {
        try {
          return (
            this._context.save(),
            this._context.setTransform(1, 0, 0, 1, 0, 0),
            t({
              context: this._context,
              mediaSize: this._mediaSize,
              bitmapSize: this._bitmapSize,
              horizontalPixelRatio: this._horizontalPixelRatio,
              verticalPixelRatio: this._verticalPixelRatio,
            })
          );
        } finally {
          this._context.restore();
        }
      }),
      Object.defineProperty(t.prototype, '_horizontalPixelRatio', {
        get: function () {
          return this._bitmapSize.width / this._mediaSize.width;
        },
        enumerable: !1,
        configurable: !0,
      }),
      Object.defineProperty(t.prototype, '_verticalPixelRatio', {
        get: function () {
          return this._bitmapSize.height / this._mediaSize.height;
        },
        enumerable: !1,
        configurable: !0,
      }),
      t
    );
  })();
  function rs(t, i) {
    var s = t.canvasElementClientSize;
    if (0 === s.width || 0 === s.height) return null;
    var n = t.bitmapSize;
    if (0 === n.width || 0 === n.height) return null;
    var e = t.canvasElement.getContext('2d', i);
    return null === e ? null : new es(e, s, n);
  }
  const hs = 'undefined' != typeof window;
  function as() {
    return (
      !!hs && window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1
    );
  }
  function ls() {
    return !!hs && /iPhone|iPad|iPod/.test(window.navigator.platform);
  }
  function os(t) {
    return t + (t % 2);
  }
  function _s(t) {
    hs &&
      void 0 !== window.chrome &&
      t.addEventListener('mousedown', (t) => {
        if (1 === t.button) return t.preventDefault(), !1;
      });
  }
  class us {
    constructor(t, i, s) {
      (this.ld = 0),
        (this.od = null),
        (this._d = {
          _t: Number.NEGATIVE_INFINITY,
          ut: Number.POSITIVE_INFINITY,
        }),
        (this.ud = 0),
        (this.dd = null),
        (this.fd = {
          _t: Number.NEGATIVE_INFINITY,
          ut: Number.POSITIVE_INFINITY,
        }),
        (this.pd = null),
        (this.vd = !1),
        (this.md = null),
        (this.wd = null),
        (this.gd = !1),
        (this.Md = !1),
        (this.bd = !1),
        (this.xd = null),
        (this.Sd = null),
        (this.Cd = null),
        (this.Pd = null),
        (this.yd = null),
        (this.kd = null),
        (this.Td = null),
        (this.Rd = 0),
        (this.Dd = !1),
        (this.Ed = !1),
        (this.Vd = !1),
        (this.Bd = 0),
        (this.Id = null),
        (this.Ad = !ls()),
        (this.zd = (t) => {
          this.Od(t);
        }),
        (this.Ld = (t) => {
          if (this.Nd(t)) {
            const i = this.Wd(t);
            if ((++this.ud, this.dd && this.ud > 1)) {
              const { Fd: s } = this.Hd(fs(t), this.fd);
              s < 30 && !this.bd && this.Ud(i, this.jd.$d), this.qd();
            }
          } else {
            const i = this.Wd(t);
            if ((++this.ld, this.od && this.ld > 1)) {
              const { Fd: s } = this.Hd(fs(t), this._d);
              s < 5 && !this.Md && this.Yd(i, this.jd.Kd), this.Xd();
            }
          }
        }),
        (this.Zd = t),
        (this.jd = i),
        (this.Ps = s),
        this.Gd();
    }
    m() {
      null !== this.xd && (this.xd(), (this.xd = null)),
        null !== this.Sd && (this.Sd(), (this.Sd = null)),
        null !== this.Pd && (this.Pd(), (this.Pd = null)),
        null !== this.yd && (this.yd(), (this.yd = null)),
        null !== this.kd && (this.kd(), (this.kd = null)),
        null !== this.Cd && (this.Cd(), (this.Cd = null)),
        this.Jd(),
        this.Xd();
    }
    Qd(t) {
      this.Pd && this.Pd();
      const i = this.tf.bind(this);
      if (
        ((this.Pd = () => {
          this.Zd.removeEventListener('mousemove', i);
        }),
        this.Zd.addEventListener('mousemove', i),
        this.Nd(t))
      )
        return;
      const s = this.Wd(t);
      this.Yd(s, this.jd.if), (this.Ad = !0);
    }
    Xd() {
      null !== this.od && clearTimeout(this.od),
        (this.ld = 0),
        (this.od = null),
        (this._d = {
          _t: Number.NEGATIVE_INFINITY,
          ut: Number.POSITIVE_INFINITY,
        });
    }
    qd() {
      null !== this.dd && clearTimeout(this.dd),
        (this.ud = 0),
        (this.dd = null),
        (this.fd = {
          _t: Number.NEGATIVE_INFINITY,
          ut: Number.POSITIVE_INFINITY,
        });
    }
    tf(t) {
      if (this.Vd || null !== this.wd) return;
      if (this.Nd(t)) return;
      const i = this.Wd(t);
      this.Yd(i, this.jd.sf), (this.Ad = !0);
    }
    nf(t) {
      const i = vs(t.changedTouches, a(this.Id));
      if (null === i) return;
      if (((this.Bd = ps(t)), null !== this.Td)) return;
      if (this.Ed) return;
      this.Dd = !0;
      const s = this.Hd(fs(i), a(this.wd)),
        { ef: n, rf: e, Fd: r } = s;
      if (this.gd || !(r < 5)) {
        if (!this.gd) {
          const t = 0.5 * n,
            i = e >= t && !this.Ps.hf(),
            s = t > e && !this.Ps.af();
          i || s || (this.Ed = !0),
            (this.gd = !0),
            (this.bd = !0),
            this.Jd(),
            this.qd();
        }
        if (!this.Ed) {
          const s = this.Wd(t, i);
          this.Ud(s, this.jd.lf), ds(t);
        }
      }
    }
    _f(t) {
      if (0 !== t.button) return;
      const i = this.Hd(fs(t), a(this.md)),
        { Fd: s } = i;
      if ((s >= 5 && ((this.Md = !0), this.Xd()), this.Md)) {
        const i = this.Wd(t);
        this.Yd(i, this.jd.uf);
      }
    }
    Hd(t, i) {
      const s = Math.abs(i._t - t._t),
        n = Math.abs(i.ut - t.ut);
      return { ef: s, rf: n, Fd: s + n };
    }
    cf(t) {
      let i = vs(t.changedTouches, a(this.Id));
      if (
        (null === i && 0 === t.touches.length && (i = t.changedTouches[0]),
        null === i)
      )
        return;
      (this.Id = null),
        (this.Bd = ps(t)),
        this.Jd(),
        (this.wd = null),
        this.kd && (this.kd(), (this.kd = null));
      const s = this.Wd(t, i);
      if ((this.Ud(s, this.jd.df), ++this.ud, this.dd && this.ud > 1)) {
        const { Fd: t } = this.Hd(fs(i), this.fd);
        t < 30 && !this.bd && this.Ud(s, this.jd.$d), this.qd();
      } else this.bd || (this.Ud(s, this.jd.ff), this.jd.ff && ds(t));
      0 === this.ud && ds(t),
        0 === t.touches.length && this.vd && ((this.vd = !1), ds(t));
    }
    Od(t) {
      if (0 !== t.button) return;
      const i = this.Wd(t);
      if (
        ((this.md = null),
        (this.Vd = !1),
        this.yd && (this.yd(), (this.yd = null)),
        as())
      ) {
        this.Zd.ownerDocument.documentElement.removeEventListener(
          'mouseleave',
          this.zd,
        );
      }
      if (!this.Nd(t))
        if ((this.Yd(i, this.jd.pf), ++this.ld, this.od && this.ld > 1)) {
          const { Fd: s } = this.Hd(fs(t), this._d);
          s < 5 && !this.Md && this.Yd(i, this.jd.Kd), this.Xd();
        } else this.Md || this.Yd(i, this.jd.vf);
    }
    Jd() {
      null !== this.pd && (clearTimeout(this.pd), (this.pd = null));
    }
    mf(t) {
      if (null !== this.Id) return;
      const i = t.changedTouches[0];
      (this.Id = i.identifier), (this.Bd = ps(t));
      const s = this.Zd.ownerDocument.documentElement;
      (this.bd = !1),
        (this.gd = !1),
        (this.Ed = !1),
        (this.wd = fs(i)),
        this.kd && (this.kd(), (this.kd = null));
      {
        const i = this.nf.bind(this),
          n = this.cf.bind(this);
        (this.kd = () => {
          s.removeEventListener('touchmove', i),
            s.removeEventListener('touchend', n);
        }),
          s.addEventListener('touchmove', i, { passive: !1 }),
          s.addEventListener('touchend', n, { passive: !1 }),
          this.Jd(),
          (this.pd = setTimeout(this.wf.bind(this, t), 240));
      }
      const n = this.Wd(t, i);
      this.Ud(n, this.jd.gf),
        this.dd ||
          ((this.ud = 0),
          (this.dd = setTimeout(this.qd.bind(this), 500)),
          (this.fd = fs(i)));
    }
    Mf(t) {
      if (0 !== t.button) return;
      const i = this.Zd.ownerDocument.documentElement;
      as() && i.addEventListener('mouseleave', this.zd),
        (this.Md = !1),
        (this.md = fs(t)),
        this.yd && (this.yd(), (this.yd = null));
      {
        const t = this._f.bind(this),
          s = this.Od.bind(this);
        (this.yd = () => {
          i.removeEventListener('mousemove', t),
            i.removeEventListener('mouseup', s);
        }),
          i.addEventListener('mousemove', t),
          i.addEventListener('mouseup', s);
      }
      if (((this.Vd = !0), this.Nd(t))) return;
      const s = this.Wd(t);
      this.Yd(s, this.jd.bf),
        this.od ||
          ((this.ld = 0),
          (this.od = setTimeout(this.Xd.bind(this), 500)),
          (this._d = fs(t)));
    }
    Gd() {
      this.Zd.addEventListener('mouseenter', this.Qd.bind(this)),
        this.Zd.addEventListener('touchcancel', this.Jd.bind(this));
      {
        const t = this.Zd.ownerDocument,
          i = (t) => {
            this.jd.xf &&
              ((t.composed && this.Zd.contains(t.composedPath()[0])) ||
                (t.target && this.Zd.contains(t.target)) ||
                this.jd.xf());
          };
        (this.Sd = () => {
          t.removeEventListener('touchstart', i);
        }),
          (this.xd = () => {
            t.removeEventListener('mousedown', i);
          }),
          t.addEventListener('mousedown', i),
          t.addEventListener('touchstart', i, { passive: !0 });
      }
      ls() &&
        ((this.Cd = () => {
          this.Zd.removeEventListener('dblclick', this.Ld);
        }),
        this.Zd.addEventListener('dblclick', this.Ld)),
        this.Zd.addEventListener('mouseleave', this.Sf.bind(this)),
        this.Zd.addEventListener('touchstart', this.mf.bind(this), {
          passive: !0,
        }),
        _s(this.Zd),
        this.Zd.addEventListener('mousedown', this.Mf.bind(this)),
        this.Cf(),
        this.Zd.addEventListener('touchmove', () => {}, { passive: !1 });
    }
    Cf() {
      (void 0 === this.jd.Pf &&
        void 0 === this.jd.yf &&
        void 0 === this.jd.kf) ||
        (this.Zd.addEventListener('touchstart', (t) => this.Tf(t.touches), {
          passive: !0,
        }),
        this.Zd.addEventListener(
          'touchmove',
          (t) => {
            if (
              2 === t.touches.length &&
              null !== this.Td &&
              void 0 !== this.jd.yf
            ) {
              const i = cs(t.touches[0], t.touches[1]) / this.Rd;
              this.jd.yf(this.Td, i), ds(t);
            }
          },
          { passive: !1 },
        ),
        this.Zd.addEventListener('touchend', (t) => {
          this.Tf(t.touches);
        }));
    }
    Tf(t) {
      1 === t.length && (this.Dd = !1),
        2 !== t.length || this.Dd || this.vd ? this.Rf() : this.Df(t);
    }
    Df(t) {
      const i = this.Zd.getBoundingClientRect() || { left: 0, top: 0 };
      (this.Td = {
        _t: (t[0].clientX - i.left + (t[1].clientX - i.left)) / 2,
        ut: (t[0].clientY - i.top + (t[1].clientY - i.top)) / 2,
      }),
        (this.Rd = cs(t[0], t[1])),
        void 0 !== this.jd.Pf && this.jd.Pf(),
        this.Jd();
    }
    Rf() {
      null !== this.Td &&
        ((this.Td = null), void 0 !== this.jd.kf && this.jd.kf());
    }
    Sf(t) {
      if ((this.Pd && this.Pd(), this.Nd(t))) return;
      if (!this.Ad) return;
      const i = this.Wd(t);
      this.Yd(i, this.jd.Ef), (this.Ad = !ls());
    }
    wf(t) {
      const i = vs(t.touches, a(this.Id));
      if (null === i) return;
      const s = this.Wd(t, i);
      this.Ud(s, this.jd.Vf), (this.bd = !0), (this.vd = !0);
    }
    Nd(t) {
      return t.sourceCapabilities &&
        void 0 !== t.sourceCapabilities.firesTouchEvents
        ? t.sourceCapabilities.firesTouchEvents
        : ps(t) < this.Bd + 500;
    }
    Ud(t, i) {
      i && i.call(this.jd, t);
    }
    Yd(t, i) {
      i && i.call(this.jd, t);
    }
    Wd(t, i) {
      const s = i || t,
        n = this.Zd.getBoundingClientRect() || { left: 0, top: 0 };
      return {
        clientX: s.clientX,
        clientY: s.clientY,
        pageX: s.pageX,
        pageY: s.pageY,
        screenX: s.screenX,
        screenY: s.screenY,
        localX: s.clientX - n.left,
        localY: s.clientY - n.top,
        ctrlKey: t.ctrlKey,
        altKey: t.altKey,
        shiftKey: t.shiftKey,
        metaKey: t.metaKey,
        Bf:
          !t.type.startsWith('mouse') &&
          'contextmenu' !== t.type &&
          'click' !== t.type,
        If: t.type,
        Af: s.target,
        a_: t.view,
        zf: () => {
          'touchstart' !== t.type && ds(t);
        },
      };
    }
  }
  function cs(t, i) {
    const s = t.clientX - i.clientX,
      n = t.clientY - i.clientY;
    return Math.sqrt(s * s + n * n);
  }
  function ds(t) {
    t.cancelable && t.preventDefault();
  }
  function fs(t) {
    return { _t: t.pageX, ut: t.pageY };
  }
  function ps(t) {
    return t.timeStamp || performance.now();
  }
  function vs(t, i) {
    for (let s = 0; s < t.length; ++s) if (t[s].identifier === i) return t[s];
    return null;
  }
  class ms {
    constructor(t, i, s) {
      (this.Of = null),
        (this.Lf = null),
        (this.Nf = !0),
        (this.Wf = null),
        (this.Ff = t),
        (this.Hf = t.Uf()[i]),
        (this.$f = t.Uf()[s]),
        (this.jf = document.createElement('tr')),
        (this.jf.style.height = '1px'),
        (this.qf = document.createElement('td')),
        (this.qf.style.position = 'relative'),
        (this.qf.style.padding = '0'),
        (this.qf.style.margin = '0'),
        this.qf.setAttribute('colspan', '3'),
        this.Yf(),
        this.jf.appendChild(this.qf),
        (this.Nf = this.Ff.N().layout.panes.enableResize),
        this.Nf ? this.Kf() : ((this.Of = null), (this.Lf = null));
    }
    m() {
      null !== this.Lf && this.Lf.m();
    }
    Xf() {
      return this.jf;
    }
    Zf() {
      return Qi({ width: this.Hf.Zf().width, height: 1 });
    }
    Gf() {
      return Qi({
        width: this.Hf.Gf().width,
        height: 1 * window.devicePixelRatio,
      });
    }
    Jf(t, i, s) {
      const n = this.Gf();
      (t.fillStyle = this.Ff.N().layout.panes.separatorColor),
        t.fillRect(i, s, n.width, n.height);
    }
    yt() {
      this.Yf(),
        this.Ff.N().layout.panes.enableResize !== this.Nf &&
          ((this.Nf = this.Ff.N().layout.panes.enableResize),
          this.Nf
            ? this.Kf()
            : (null !== this.Of &&
                (this.qf.removeChild(this.Of.Qf),
                this.qf.removeChild(this.Of.tp),
                (this.Of = null)),
              null !== this.Lf && (this.Lf.m(), (this.Lf = null))));
    }
    Kf() {
      const t = document.createElement('div'),
        i = t.style;
      (i.position = 'fixed'),
        (i.display = 'none'),
        (i.zIndex = '49'),
        (i.top = '0'),
        (i.left = '0'),
        (i.width = '100%'),
        (i.height = '100%'),
        (i.cursor = 'row-resize'),
        this.qf.appendChild(t);
      const s = document.createElement('div'),
        n = s.style;
      (n.position = 'absolute'),
        (n.zIndex = '50'),
        (n.top = '-4px'),
        (n.height = '9px'),
        (n.width = '100%'),
        (n.backgroundColor = ''),
        (n.cursor = 'row-resize'),
        this.qf.appendChild(s);
      const e = {
        if: this.ip.bind(this),
        Ef: this.sp.bind(this),
        bf: this.np.bind(this),
        gf: this.np.bind(this),
        uf: this.ep.bind(this),
        lf: this.ep.bind(this),
        pf: this.rp.bind(this),
        df: this.rp.bind(this),
      };
      (this.Lf = new us(s, e, { hf: () => !1, af: () => !0 })),
        (this.Of = { tp: s, Qf: t });
    }
    Yf() {
      this.qf.style.background = this.Ff.N().layout.panes.separatorColor;
    }
    ip(t) {
      null !== this.Of &&
        (this.Of.tp.style.backgroundColor =
          this.Ff.N().layout.panes.separatorHoverColor);
    }
    sp(t) {
      null !== this.Of &&
        null === this.Wf &&
        (this.Of.tp.style.backgroundColor = '');
    }
    np(t) {
      if (null === this.Of) return;
      const i = this.Hf.hp().Vo() + this.$f.hp().Vo(),
        s = i / (this.Hf.Zf().height + this.$f.Zf().height),
        n = 30 * s;
      i <= 2 * n ||
        ((this.Wf = {
          ap: t.pageY,
          lp: this.Hf.hp().Vo(),
          op: i - n,
          _p: i,
          up: s,
          cp: n,
        }),
        (this.Of.Qf.style.display = 'block'));
    }
    ep(t) {
      const i = this.Wf;
      if (null === i) return;
      const s = (t.pageY - i.ap) * i.up,
        n = Yt(i.lp + s, i.cp, i.op);
      this.Hf.hp().Bo(n), this.$f.hp().Bo(i._p - n), this.Ff.Qt().Bh();
    }
    rp(t) {
      null !== this.Wf &&
        null !== this.Of &&
        ((this.Wf = null), (this.Of.Qf.style.display = 'none'));
    }
  }
  function ws(t, i) {
    return t.dp - i.dp;
  }
  function gs(t, i, s) {
    const n = (t.dp - i.dp) / (t.wt - i.wt);
    return Math.sign(n) * Math.min(Math.abs(n), s);
  }
  class Ms {
    constructor(t, i, s, n) {
      (this.fp = null),
        (this.pp = null),
        (this.vp = null),
        (this.mp = null),
        (this.wp = null),
        (this.gp = 0),
        (this.Mp = 0),
        (this.bp = t),
        (this.xp = i),
        (this.Sp = s),
        (this.Mn = n);
    }
    Cp(t, i) {
      if (null !== this.fp) {
        if (this.fp.wt === i) return void (this.fp.dp = t);
        if (Math.abs(this.fp.dp - t) < this.Mn) return;
      }
      (this.mp = this.vp),
        (this.vp = this.pp),
        (this.pp = this.fp),
        (this.fp = { wt: i, dp: t });
    }
    le(t, i) {
      if (null === this.fp || null === this.pp) return;
      if (i - this.fp.wt > 50) return;
      let s = 0;
      const n = gs(this.fp, this.pp, this.xp),
        e = ws(this.fp, this.pp),
        r = [n],
        h = [e];
      if (((s += e), null !== this.vp)) {
        const t = gs(this.pp, this.vp, this.xp);
        if (Math.sign(t) === Math.sign(n)) {
          const i = ws(this.pp, this.vp);
          if ((r.push(t), h.push(i), (s += i), null !== this.mp)) {
            const t = gs(this.vp, this.mp, this.xp);
            if (Math.sign(t) === Math.sign(n)) {
              const i = ws(this.vp, this.mp);
              r.push(t), h.push(i), (s += i);
            }
          }
        }
      }
      let a = 0;
      for (let t = 0; t < r.length; ++t) a += (h[t] / s) * r[t];
      Math.abs(a) < this.bp ||
        ((this.wp = { dp: t, wt: i }),
        (this.Mp = a),
        (this.gp = (function (t, i) {
          const s = Math.log(i);
          return Math.log((1 * s) / -t) / s;
        })(Math.abs(a), this.Sp)));
    }
    Ru(t) {
      const i = a(this.wp),
        s = t - i.wt;
      return i.dp + (this.Mp * (Math.pow(this.Sp, s) - 1)) / Math.log(this.Sp);
    }
    Tu(t) {
      return null === this.wp || this.Pp(t) === this.gp;
    }
    Pp(t) {
      const i = t - a(this.wp).wt;
      return Math.min(i, this.gp);
    }
  }
  class bs {
    constructor(t, i) {
      (this.yp = void 0),
        (this.kp = void 0),
        (this.Tp = void 0),
        (this.ps = !1),
        (this.Rp = t),
        (this.Dp = i),
        this.Ep();
    }
    yt() {
      this.Ep();
    }
    Vp() {
      this.yp && this.Rp.removeChild(this.yp),
        this.kp && this.Rp.removeChild(this.kp),
        (this.yp = void 0),
        (this.kp = void 0);
    }
    Bp() {
      return this.ps !== this.Ip() || this.Tp !== this.Ap();
    }
    Ap() {
      return this.Dp.Qt().Xi().J(this.Dp.N().layout.textColor) > 160
        ? 'dark'
        : 'light';
    }
    Ip() {
      return this.Dp.N().layout.attributionLogo;
    }
    zp() {
      const t = new URL(location.href);
      return t.hostname ? '&utm_source=' + t.hostname + t.pathname : '';
    }
    Ep() {
      this.Bp() &&
        (this.Vp(),
        (this.ps = this.Ip()),
        this.ps &&
          ((this.Tp = this.Ap()),
          (this.kp = document.createElement('style')),
          (this.kp.innerText =
            'a#tv-attr-logo{--fill:#131722;--stroke:#fff;position:absolute;left:10px;bottom:10px;height:19px;width:35px;margin:0;padding:0;border:0;z-index:3;}a#tv-attr-logo[data-dark]{--fill:#D1D4DC;--stroke:#131722;}'),
          (this.yp = document.createElement('a')),
          (this.yp.href = `https://www.tradingview.com/?utm_medium=lwc-link&utm_campaign=lwc-chart${this.zp()}`),
          (this.yp.title = 'Charting by TradingView'),
          (this.yp.id = 'tv-attr-logo'),
          (this.yp.target = '_blank'),
          (this.yp.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="35" height="19" fill="none"><g fill-rule="evenodd" clip-path="url(#a)" clip-rule="evenodd"><path fill="var(--stroke)" d="M2 0H0v10h6v9h21.4l.5-1.3 6-15 1-2.7H23.7l-.5 1.3-.2.6a5 5 0 0 0-7-.9V0H2Zm20 17h4l5.2-13 .8-2h-7l-1 2.5-.2.5-1.5 3.8-.3.7V17Zm-.8-10a3 3 0 0 0 .7-2.7A3 3 0 1 0 16.8 7h4.4ZM14 7V2H2v6h6v9h4V7h2Z"/><path fill="var(--fill)" d="M14 2H2v6h6v9h6V2Zm12 15h-7l6-15h7l-6 15Zm-7-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></g><defs><clipPath id="a"><path fill="var(--stroke)" d="M0 0h35v19H0z"/></clipPath></defs></svg>'),
          this.yp.toggleAttribute('data-dark', 'dark' === this.Tp),
          this.Rp.appendChild(this.kp),
          this.Rp.appendChild(this.yp)));
    }
  }
  function xs(t, i) {
    const s = a(t.ownerDocument).createElement('canvas');
    t.appendChild(s);
    const n = new ss(
      s,
      (e = {
        options: { allowResizeObserver: !0 },
        transform: (t, i) => ({
          width: Math.max(t.width, i.width),
          height: Math.max(t.height, i.height),
        }),
      }).transform,
      e.options,
    );
    var e;
    return n.resizeCanvasElement(i), n;
  }
  function Ss(t) {
    (t.width = 1), (t.height = 1), t.getContext('2d')?.clearRect(0, 0, 1, 1);
  }
  function Cs(t, i, s, n) {
    t.ih && t.ih(i, s, n);
  }
  function Ps(t, i, s, n) {
    t.nt(i, s, n);
  }
  function ys(t, i, s, n) {
    const e = t(s, n);
    for (const t of e) {
      const s = t.Tt(n);
      null !== s && i(s);
    }
  }
  function ks(t, i) {
    return (s) => {
      if (
        !(function (t) {
          return void 0 !== t.Wt;
        })(s)
      )
        return [];
      return (s.Wt()?.wa() ?? '') !== i ? [] : s.ta?.(t) ?? [];
    };
  }
  function Ts(t, i, s, n) {
    if (!t.length) return;
    let e = 0;
    const r = t[0].$t(n, !0);
    let h = 1 === i ? s / 2 - (t[0].Wi() - r / 2) : t[0].Wi() - r / 2 - s / 2;
    h = Math.max(0, h);
    for (let r = 1; r < t.length; r++) {
      const a = t[r],
        l = t[r - 1],
        o = l.$t(n, !1),
        _ = a.Wi(),
        u = l.Wi();
      if (1 === i ? _ > u - o : _ < u + o) {
        const n = u - o * i;
        a.Fi(n);
        const r = n - (i * o) / 2;
        if ((1 === i ? r < 0 : r > s) && h > 0) {
          const n = 1 === i ? -1 - r : r - s,
            a = Math.min(n, h);
          for (let s = e; s < t.length; s++) t[s].Fi(t[s].Wi() + i * a);
          h -= a;
        }
      } else (e = r), (h = 1 === i ? u - o - _ : _ - (u + o));
    }
  }
  class Rs {
    constructor(t, i, s, n) {
      (this.qi = null),
        (this.Op = null),
        (this.Lp = !1),
        (this.Np = new it(200)),
        (this.Wp = null),
        (this.Fp = 0),
        (this.Hp = !1),
        (this.Up = () => {
          this.Hp || this.Pt.$p().Qt().ar();
        }),
        (this.jp = () => {
          this.Hp || this.Pt.$p().Qt().ar();
        }),
        (this.Pt = t),
        (this.Ps = i),
        (this.bl = i.layout),
        (this.Gu = s),
        (this.qp = 'left' === n),
        (this.Yp = ks('normal', n)),
        (this.Kp = ks('top', n)),
        (this.Xp = ks('bottom', n)),
        (this.qf = document.createElement('div')),
        (this.qf.style.height = '100%'),
        (this.qf.style.overflow = 'hidden'),
        (this.qf.style.width = '25px'),
        (this.qf.style.left = '0'),
        (this.qf.style.position = 'relative'),
        (this.Zp = xs(this.qf, Qi({ width: 16, height: 16 }))),
        this.Zp.subscribeSuggestedBitmapSizeChanged(this.Up);
      const e = this.Zp.canvasElement;
      (e.style.position = 'absolute'),
        (e.style.zIndex = '1'),
        (e.style.left = '0'),
        (e.style.top = '0'),
        (this.Gp = xs(this.qf, Qi({ width: 16, height: 16 }))),
        this.Gp.subscribeSuggestedBitmapSizeChanged(this.jp);
      const r = this.Gp.canvasElement;
      (r.style.position = 'absolute'),
        (r.style.zIndex = '2'),
        (r.style.left = '0'),
        (r.style.top = '0');
      const h = {
        bf: this.np.bind(this),
        gf: this.np.bind(this),
        uf: this.ep.bind(this),
        lf: this.ep.bind(this),
        xf: this.Jp.bind(this),
        pf: this.rp.bind(this),
        df: this.rp.bind(this),
        Kd: this.Qp.bind(this),
        $d: this.Qp.bind(this),
        if: this.tv.bind(this),
        Ef: this.sp.bind(this),
      };
      this.Lf = new us(this.Gp.canvasElement, h, {
        hf: () => !this.Ps.handleScroll.vertTouchDrag,
        af: () => !0,
      });
    }
    m() {
      this.Lf.m(),
        this.Gp.unsubscribeSuggestedBitmapSizeChanged(this.jp),
        Ss(this.Gp.canvasElement),
        this.Gp.dispose(),
        this.Zp.unsubscribeSuggestedBitmapSizeChanged(this.Up),
        Ss(this.Zp.canvasElement),
        this.Zp.dispose(),
        null !== this.qi && this.qi.no().u(this),
        (this.qi = null);
    }
    Xf() {
      return this.qf;
    }
    P() {
      return this.bl.fontSize;
    }
    iv() {
      const t = this.Gu.N();
      return this.Wp !== t.k && (this.Np.Vn(), (this.Wp = t.k)), t;
    }
    sv() {
      if (null === this.qi) return 0;
      let t = 0;
      const i = this.iv(),
        s = a(
          this.Zp.canvasElement.getContext('2d', {
            colorSpace: this.Pt.$p().N().layout.colorSpace,
          }),
        );
      s.save();
      const n = this.qi.Ea();
      (s.font = this.nv()),
        n.length > 0 &&
          (t = Math.max(
            this.Np.Ei(s, n[0].Ga),
            this.Np.Ei(s, n[n.length - 1].Ga),
          ));
      const e = this.ev();
      for (let i = e.length; i--; ) {
        const n = this.Np.Ei(s, e[i].ri());
        n > t && (t = n);
      }
      const r = this.qi.zt();
      if (
        null !== r &&
        null !== this.Op &&
        2 !== (h = this.Ps.crosshair).mode &&
        h.horzLine.visible &&
        h.horzLine.labelVisible
      ) {
        const i = this.qi.Ts(1, r),
          n = this.qi.Ts(this.Op.height - 2, r);
        t = Math.max(
          t,
          this.Np.Ei(
            s,
            this.qi.Zi(Math.floor(Math.min(i, n)) + 0.11111111111111, r),
          ),
          this.Np.Ei(
            s,
            this.qi.Zi(Math.ceil(Math.max(i, n)) - 0.11111111111111, r),
          ),
        );
      }
      var h;
      s.restore();
      const l = t || 34;
      return os(Math.ceil(i.S + i.C + i.B + i.I + 5 + l));
    }
    rv(t) {
      (null !== this.Op && ts(this.Op, t)) ||
        ((this.Op = t),
        (this.Hp = !0),
        this.Zp.resizeCanvasElement(t),
        this.Gp.resizeCanvasElement(t),
        (this.Hp = !1),
        (this.qf.style.width = `${t.width}px`),
        (this.qf.style.height = `${t.height}px`));
    }
    hv() {
      return a(this.Op).width;
    }
    _s(t) {
      this.qi !== t &&
        (null !== this.qi && this.qi.no().u(this),
        (this.qi = t),
        t.no().i(this.ul.bind(this), this));
    }
    Wt() {
      return this.qi;
    }
    Vn() {
      const t = this.Pt.hp();
      this.Pt.$p().Qt().Zo(t, a(this.Wt()));
    }
    av(t) {
      if (null === this.Op) return;
      const i = { colorSpace: this.Pt.$p().N().layout.colorSpace };
      if (1 !== t) {
        this.lv(), this.Zp.applySuggestedBitmapSize();
        const t = rs(this.Zp, i);
        null !== t &&
          (t.useBitmapCoordinateSpace((t) => {
            this.ov(t), this._v(t);
          }),
          this.Pt.uv(t, this.Xp),
          this.cv(t),
          this.Pt.uv(t, this.Yp),
          this.dv(t));
      }
      this.Gp.applySuggestedBitmapSize();
      const s = rs(this.Gp, i);
      null !== s &&
        (s.useBitmapCoordinateSpace(({ context: t, bitmapSize: i }) => {
          t.clearRect(0, 0, i.width, i.height);
        }),
        this.fv(s),
        this.Pt.uv(s, this.Kp));
    }
    Gf() {
      return this.Zp.bitmapSize;
    }
    Jf(t, i, s) {
      const n = this.Gf();
      n.width > 0 && n.height > 0 && t.drawImage(this.Zp.canvasElement, i, s);
    }
    yt() {
      this.qi?.Ea();
    }
    np(t) {
      if (
        null === this.qi ||
        this.qi.Ki() ||
        !this.Ps.handleScale.axisPressedMouseMove.price
      )
        return;
      const i = this.Pt.$p().Qt(),
        s = this.Pt.hp();
      (this.Lp = !0), i.Uo(s, this.qi, t.localY);
    }
    ep(t) {
      if (null === this.qi || !this.Ps.handleScale.axisPressedMouseMove.price)
        return;
      const i = this.Pt.$p().Qt(),
        s = this.Pt.hp(),
        n = this.qi;
      i.$o(s, n, t.localY);
    }
    Jp() {
      if (null === this.qi || !this.Ps.handleScale.axisPressedMouseMove.price)
        return;
      const t = this.Pt.$p().Qt(),
        i = this.Pt.hp(),
        s = this.qi;
      this.Lp && ((this.Lp = !1), t.jo(i, s));
    }
    rp(t) {
      if (null === this.qi || !this.Ps.handleScale.axisPressedMouseMove.price)
        return;
      const i = this.Pt.$p().Qt(),
        s = this.Pt.hp();
      (this.Lp = !1), i.jo(s, this.qi);
    }
    Qp(t) {
      this.Ps.handleScale.axisDoubleClickReset.price && this.Vn();
    }
    tv(t) {
      if (null === this.qi) return;
      !this.Pt.$p().Qt().N().handleScale.axisPressedMouseMove.price ||
        this.qi.Oe() ||
        this.qi.El() ||
        this.pv(1);
    }
    sp(t) {
      this.pv(0);
    }
    ev() {
      const t = [],
        i = null === this.qi ? void 0 : this.qi;
      return (
        ((s) => {
          for (let n = 0; n < s.length; ++n) {
            const e = s[n].Fs(this.Pt.hp(), i);
            for (let i = 0; i < e.length; i++) t.push(e[i]);
          }
        })(this.Pt.hp().Dt()),
        t
      );
    }
    ov({ context: t, bitmapSize: i }) {
      const { width: s, height: n } = i,
        e = this.Pt.hp().Qt(),
        r = e.$(),
        h = e.Wc();
      r === h ? B(t, 0, 0, s, n, r) : z(t, 0, 0, s, n, r, h);
    }
    _v({ context: t, bitmapSize: i, horizontalPixelRatio: s }) {
      if (null === this.Op || null === this.qi || !this.qi.N().borderVisible)
        return;
      t.fillStyle = this.qi.N().borderColor;
      const n = Math.max(1, Math.floor(this.iv().S * s));
      let e;
      (e = this.qp ? i.width - n : 0), t.fillRect(e, 0, n, i.height);
    }
    cv(t) {
      if (null === this.Op || null === this.qi) return;
      const i = this.qi.Ea(),
        s = this.qi.N(),
        n = this.iv(),
        e = this.qp ? this.Op.width - n.C : 0;
      s.borderVisible &&
        s.ticksVisible &&
        t.useBitmapCoordinateSpace(
          ({ context: t, horizontalPixelRatio: r, verticalPixelRatio: h }) => {
            t.fillStyle = s.borderColor;
            const a = Math.max(1, Math.floor(h)),
              l = Math.floor(0.5 * h),
              o = Math.round(n.C * r);
            t.beginPath();
            for (const s of i)
              t.rect(Math.floor(e * r), Math.round(s.ya * h) - l, o, a);
            t.fill();
          },
        ),
        t.useMediaCoordinateSpace(({ context: t }) => {
          (t.font = this.nv()),
            (t.fillStyle = s.textColor ?? this.bl.textColor),
            (t.textAlign = this.qp ? 'right' : 'left'),
            (t.textBaseline = 'middle');
          const r = this.qp ? Math.round(e - n.B) : Math.round(e + n.C + n.B),
            h = i.map((i) => this.Np.Di(t, i.Ga));
          for (let s = i.length; s--; ) {
            const n = i[s];
            t.fillText(n.Ga, r, n.ya + h[s]);
          }
        });
    }
    lv() {
      if (null === this.Op || null === this.qi) return;
      let t = this.Op.height / 2;
      const i = [],
        s = this.qi.Dt().slice(),
        n = this.Pt.hp(),
        e = this.iv();
      this.qi === n.$n() &&
        this.Pt.hp()
          .Dt()
          .forEach((t) => {
            n.Un(t) && s.push(t);
          });
      const r = this.qi.ba()[0],
        h = this.qi;
      s.forEach((s) => {
        const e = s.Fs(n, h);
        e.forEach((t) => {
          t.Fi(null), t.Hi() && i.push(t);
        }),
          r === s && e.length > 0 && (t = e[0].Bi());
      }),
        i.forEach((t) => t.Fi(t.Bi()));
      this.qi.N().alignLabels && this.vv(i, e, t);
    }
    vv(t, i, s) {
      if (null === this.Op) return;
      const n = t.filter((t) => t.Bi() <= s),
        e = t.filter((t) => t.Bi() > s);
      n.sort((t, i) => i.Bi() - t.Bi()),
        n.length && e.length && e.push(n[0]),
        e.sort((t, i) => t.Bi() - i.Bi());
      for (const s of t) {
        const t = Math.floor(s.$t(i) / 2),
          n = s.Bi();
        n > -t && n < t && s.Fi(t),
          n > this.Op.height - t &&
            n < this.Op.height + t &&
            s.Fi(this.Op.height - t);
      }
      Ts(n, 1, this.Op.height, i), Ts(e, -1, this.Op.height, i);
    }
    dv(t) {
      if (null === this.Op) return;
      const i = this.ev(),
        s = this.iv(),
        n = this.qp ? 'right' : 'left';
      i.forEach((i) => {
        if (i.Ui()) {
          i.Tt(a(this.qi)).nt(t, s, this.Np, n);
        }
      });
    }
    fv(t) {
      if (null === this.Op || null === this.qi) return;
      const i = this.Pt.$p().Qt(),
        s = [],
        n = this.Pt.hp(),
        e = i._c().Fs(n, this.qi);
      e.length && s.push(e);
      const r = this.iv(),
        h = this.qp ? 'right' : 'left';
      s.forEach((i) => {
        i.forEach((i) => {
          i.Tt(a(this.qi)).nt(t, r, this.Np, h);
        });
      });
    }
    pv(t) {
      this.qf.style.cursor = 1 === t ? 'ns-resize' : 'default';
    }
    ul() {
      const t = this.sv();
      this.Fp < t && this.Pt.$p().Qt().Bh(), (this.Fp = t);
    }
    nv() {
      return g(this.bl.fontSize, this.bl.fontFamily);
    }
  }
  function Ds(t, i) {
    return t.Jh?.(i) ?? [];
  }
  function Es(t, i) {
    return t.Ws?.(i) ?? [];
  }
  function Vs(t, i) {
    return t.us?.(i) ?? [];
  }
  function Bs(t, i) {
    return t.Xh?.(i) ?? [];
  }
  class Is {
    constructor(t, i) {
      (this.Op = Qi({ width: 0, height: 0 })),
        (this.mv = null),
        (this.wv = null),
        (this.gv = null),
        (this.Mv = null),
        (this.bv = !1),
        (this.xv = new o()),
        (this.Sv = new o()),
        (this.Cv = 0),
        (this.Pv = !1),
        (this.yv = null),
        (this.kv = !1),
        (this.Tv = null),
        (this.Rv = null),
        (this.Hp = !1),
        (this.Up = () => {
          this.Hp || null === this.Dv || this.ts().ar();
        }),
        (this.jp = () => {
          this.Hp || null === this.Dv || this.ts().ar();
        }),
        (this.Dp = t),
        (this.Dv = i),
        this.Dv.t_().i(this.Ev.bind(this), this, !0),
        (this.Vv = document.createElement('td')),
        (this.Vv.style.padding = '0'),
        (this.Vv.style.position = 'relative');
      const s = document.createElement('div');
      (s.style.width = '100%'),
        (s.style.height = '100%'),
        (s.style.position = 'relative'),
        (s.style.overflow = 'hidden'),
        (this.Bv = document.createElement('td')),
        (this.Bv.style.padding = '0'),
        (this.Iv = document.createElement('td')),
        (this.Iv.style.padding = '0'),
        this.Vv.appendChild(s),
        (this.Zp = xs(s, Qi({ width: 16, height: 16 }))),
        this.Zp.subscribeSuggestedBitmapSizeChanged(this.Up);
      const n = this.Zp.canvasElement;
      (n.style.position = 'absolute'),
        (n.style.zIndex = '1'),
        (n.style.left = '0'),
        (n.style.top = '0'),
        (this.Gp = xs(s, Qi({ width: 16, height: 16 }))),
        this.Gp.subscribeSuggestedBitmapSizeChanged(this.jp);
      const e = this.Gp.canvasElement;
      (e.style.position = 'absolute'),
        (e.style.zIndex = '2'),
        (e.style.left = '0'),
        (e.style.top = '0'),
        (this.jf = document.createElement('tr')),
        this.jf.appendChild(this.Bv),
        this.jf.appendChild(this.Vv),
        this.jf.appendChild(this.Iv),
        this.Av(),
        (this.Lf = new us(this.Gp.canvasElement, this, {
          hf: () => null === this.yv && !this.Dp.N().handleScroll.vertTouchDrag,
          af: () => null === this.yv && !this.Dp.N().handleScroll.horzTouchDrag,
        }));
    }
    m() {
      null !== this.mv && this.mv.m(),
        null !== this.wv && this.wv.m(),
        (this.gv = null),
        this.Gp.unsubscribeSuggestedBitmapSizeChanged(this.jp),
        Ss(this.Gp.canvasElement),
        this.Gp.dispose(),
        this.Zp.unsubscribeSuggestedBitmapSizeChanged(this.Up),
        Ss(this.Zp.canvasElement),
        this.Zp.dispose(),
        null !== this.Dv && (this.Dv.t_().u(this), this.Dv.m()),
        this.Lf.m();
    }
    hp() {
      return a(this.Dv);
    }
    zv(t) {
      null !== this.Dv && this.Dv.t_().u(this),
        (this.Dv = t),
        null !== this.Dv &&
          this.Dv.t_().i(Is.prototype.Ev.bind(this), this, !0),
        this.Av(),
        this.Dp.Uf().indexOf(this) === this.Dp.Uf().length - 1
          ? ((this.gv = this.gv ?? new bs(this.Vv, this.Dp)), this.gv.yt())
          : (this.gv?.Vp(), (this.gv = null));
    }
    $p() {
      return this.Dp;
    }
    Xf() {
      return this.jf;
    }
    Av() {
      if (null !== this.Dv && (this.Ov(), 0 !== this.ts().Ys().length)) {
        if (null !== this.mv) {
          const t = this.Dv.Fo();
          this.mv._s(a(t));
        }
        if (null !== this.wv) {
          const t = this.Dv.Ho();
          this.wv._s(a(t));
        }
      }
    }
    Lv() {
      null !== this.mv && this.mv.yt(), null !== this.wv && this.wv.yt();
    }
    Vo() {
      return null !== this.Dv ? this.Dv.Vo() : 0;
    }
    Bo(t) {
      this.Dv && this.Dv.Bo(t);
    }
    if(t) {
      if (!this.Dv) return;
      this.Nv();
      const i = t.localX,
        s = t.localY;
      this.Wv(i, s, t);
    }
    bf(t) {
      this.Nv(), this.Fv(), this.Wv(t.localX, t.localY, t);
    }
    sf(t) {
      if (!this.Dv) return;
      this.Nv();
      const i = t.localX,
        s = t.localY;
      this.Wv(i, s, t);
    }
    vf(t) {
      null !== this.Dv && (this.Nv(), this.Hv(t));
    }
    Kd(t) {
      null !== this.Dv && this.Uv(this.Sv, t);
    }
    $d(t) {
      this.Kd(t);
    }
    uf(t) {
      this.Nv(), this.$v(t), this.Wv(t.localX, t.localY, t);
    }
    pf(t) {
      null !== this.Dv && (this.Nv(), (this.Pv = !1), this.jv(t));
    }
    ff(t) {
      null !== this.Dv && this.Hv(t);
    }
    Vf(t) {
      if (((this.Pv = !0), null === this.yv)) {
        const i = { x: t.localX, y: t.localY };
        this.qv(i, i, t);
      }
    }
    Ef(t) {
      null !== this.Dv && (this.Nv(), this.Dv.Qt().ac(null), this.Yv());
    }
    Kv() {
      return this.xv;
    }
    Xv() {
      return this.Sv;
    }
    Pf() {
      (this.Cv = 1), this.ts().hn();
    }
    yf(t, i) {
      if (!this.Dp.N().handleScale.pinch) return;
      const s = 5 * (i - this.Cv);
      (this.Cv = i), this.ts().Mc(t._t, s);
    }
    gf(t) {
      (this.Pv = !1), (this.kv = null !== this.yv), this.Fv();
      const i = this.ts()._c();
      null !== this.yv &&
        i.Et() &&
        ((this.Tv = { x: i.si(), y: i.ni() }),
        (this.yv = { x: t.localX, y: t.localY }));
    }
    lf(t) {
      if (null === this.Dv) return;
      const i = t.localX,
        s = t.localY;
      if (null === this.yv) this.$v(t);
      else {
        this.kv = !1;
        const n = a(this.Tv),
          e = n.x + (i - this.yv.x),
          r = n.y + (s - this.yv.y);
        this.Wv(e, r, t);
      }
    }
    df(t) {
      0 === this.$p().N().trackingMode.exitMode && (this.kv = !0),
        this.Zv(),
        this.jv(t);
    }
    Yn(t, i) {
      const s = this.Dv;
      return null === s ? null : bi(s, t, i);
    }
    Gv(t, i) {
      a('left' === i ? this.mv : this.wv).rv(
        Qi({ width: t, height: this.Op.height }),
      );
    }
    Zf() {
      return this.Op;
    }
    rv(t) {
      ts(this.Op, t) ||
        ((this.Op = t),
        (this.Hp = !0),
        this.Zp.resizeCanvasElement(t),
        this.Gp.resizeCanvasElement(t),
        (this.Hp = !1),
        (this.Vv.style.width = t.width + 'px'),
        (this.Vv.style.height = t.height + 'px'));
    }
    Jv() {
      const t = a(this.Dv);
      t.Wo(t.Fo()), t.Wo(t.Ho());
      for (const i of t.ba())
        if (t.Un(i)) {
          const s = i.Wt();
          null !== s && t.Wo(s), i.Ns();
        }
      for (const i of t.s_()) i.Ns();
    }
    Gf() {
      return this.Zp.bitmapSize;
    }
    Jf(t, i, s) {
      const n = this.Gf();
      n.width > 0 && n.height > 0 && t.drawImage(this.Zp.canvasElement, i, s);
    }
    av(t) {
      if (0 === t) return;
      if (null === this.Dv) return;
      t > 1 && this.Jv(),
        null !== this.mv && this.mv.av(t),
        null !== this.wv && this.wv.av(t);
      const i = { colorSpace: this.Dp.N().layout.colorSpace };
      if (1 !== t) {
        this.Zp.applySuggestedBitmapSize();
        const t = rs(this.Zp, i);
        null !== t &&
          (t.useBitmapCoordinateSpace((t) => {
            this.ov(t);
          }),
          this.Dv &&
            (this.Qv(t, Ds), this.tm(t), this.Qv(t, Es), this.Qv(t, Vs)));
      }
      this.Gp.applySuggestedBitmapSize();
      const s = rs(this.Gp, i);
      null !== s &&
        (s.useBitmapCoordinateSpace(({ context: t, bitmapSize: i }) => {
          t.clearRect(0, 0, i.width, i.height);
        }),
        this.im(s),
        this.Qv(s, Bs),
        this.Qv(s, Vs));
    }
    sm() {
      return this.mv;
    }
    nm() {
      return this.wv;
    }
    uv(t, i) {
      this.Qv(t, i);
    }
    Ev() {
      null !== this.Dv && this.Dv.t_().u(this), (this.Dv = null);
    }
    Hv(t) {
      this.Uv(this.xv, t);
    }
    Uv(t, i) {
      const s = i.localX,
        n = i.localY;
      t.v() && t.p(this.ts().It().uu(s), { x: s, y: n }, i);
    }
    ov({ context: t, bitmapSize: i }) {
      const { width: s, height: n } = i,
        e = this.ts(),
        r = e.$(),
        h = e.Wc();
      r === h ? B(t, 0, 0, s, n, h) : z(t, 0, 0, s, n, r, h);
    }
    tm(t) {
      const i = a(this.Dv),
        s = i.i_().lr().Tt(i);
      null !== s && s.nt(t, !1);
    }
    im(t) {
      this.rm(t, Es, Ps, this.ts()._c());
    }
    Qv(t, i) {
      const s = a(this.Dv),
        n = s.Dt(),
        e = s.s_();
      for (const s of e) this.rm(t, i, Cs, s);
      for (const s of n) this.rm(t, i, Cs, s);
      for (const s of e) this.rm(t, i, Ps, s);
      for (const s of n) this.rm(t, i, Ps, s);
    }
    rm(t, i, s, n) {
      const e = a(this.Dv),
        r = e.Qt().hc(),
        h = null !== r && r.n_ === n,
        l = null !== r && h && void 0 !== r.e_ ? r.e_.Xn : void 0;
      ys(i, (i) => s(i, t, h, l), n, e);
    }
    Ov() {
      if (null === this.Dv) return;
      const t = this.Dp,
        i = this.Dv.Fo().N().visible,
        s = this.Dv.Ho().N().visible;
      i ||
        null === this.mv ||
        (this.Bv.removeChild(this.mv.Xf()), this.mv.m(), (this.mv = null)),
        s ||
          null === this.wv ||
          (this.Iv.removeChild(this.wv.Xf()), this.wv.m(), (this.wv = null));
      const n = t.Qt().Ec();
      i &&
        null === this.mv &&
        ((this.mv = new Rs(this, t.N(), n, 'left')),
        this.Bv.appendChild(this.mv.Xf())),
        s &&
          null === this.wv &&
          ((this.wv = new Rs(this, t.N(), n, 'right')),
          this.Iv.appendChild(this.wv.Xf()));
    }
    hm(t) {
      return (t.Bf && this.Pv) || null !== this.yv;
    }
    am(t) {
      return Math.max(0, Math.min(t, this.Op.width - 1));
    }
    lm(t) {
      return Math.max(0, Math.min(t, this.Op.height - 1));
    }
    Wv(t, i, s) {
      this.ts().kc(this.am(t), this.lm(i), s, a(this.Dv));
    }
    Yv() {
      this.ts().Rc();
    }
    Zv() {
      this.kv && ((this.yv = null), this.Yv());
    }
    qv(t, i, s) {
      (this.yv = t), (this.kv = !1), this.Wv(i.x, i.y, s);
      const n = this.ts()._c();
      this.Tv = { x: n.si(), y: n.ni() };
    }
    ts() {
      return this.Dp.Qt();
    }
    jv(t) {
      if (!this.bv) return;
      const i = this.ts(),
        s = this.hp();
      if (
        (i.Ko(s, s.ks()),
        (this.Mv = null),
        (this.bv = !1),
        i.Cc(),
        null !== this.Rv)
      ) {
        const t = performance.now(),
          s = i.It();
        this.Rv.le(s.wu(), t), this.Rv.Tu(t) || i._n(this.Rv);
      }
    }
    Nv() {
      this.yv = null;
    }
    Fv() {
      if (!this.Dv) return;
      if (
        (this.ts().hn(),
        document.activeElement !== document.body &&
          document.activeElement !== document.documentElement)
      )
        a(document.activeElement).blur();
      else {
        const t = document.getSelection();
        null !== t && t.removeAllRanges();
      }
      !this.Dv.ks().Ki() && this.ts().It().Ki();
    }
    $v(t) {
      if (null === this.Dv) return;
      const i = this.ts(),
        s = i.It();
      if (s.Ki()) return;
      const n = this.Dp.N(),
        e = n.handleScroll,
        r = n.kineticScroll;
      if (
        (!e.pressedMouseMove || t.Bf) &&
        ((!e.horzTouchDrag && !e.vertTouchDrag) || !t.Bf)
      )
        return;
      const h = this.Dv.ks(),
        a = performance.now();
      if (
        (null !== this.Mv ||
          this.hm(t) ||
          (this.Mv = {
            x: t.clientX,
            y: t.clientY,
            ed: a,
            om: t.localX,
            _m: t.localY,
          }),
        null !== this.Mv &&
          !this.bv &&
          (this.Mv.x !== t.clientX || this.Mv.y !== t.clientY))
      ) {
        if ((t.Bf && r.touch) || (!t.Bf && r.mouse)) {
          const t = s.vu();
          (this.Rv = new Ms(0.2 / t, 7 / t, 0.997, 15 / t)),
            this.Rv.Cp(s.wu(), this.Mv.ed);
        } else this.Rv = null;
        h.Ki() || i.qo(this.Dv, h, t.localY), i.xc(t.localX), (this.bv = !0);
      }
      this.bv &&
        (h.Ki() || i.Yo(this.Dv, h, t.localY),
        i.Sc(t.localX),
        null !== this.Rv && this.Rv.Cp(s.wu(), a));
    }
  }
  class As {
    constructor(t, i, s, n, e) {
      (this.St = !0),
        (this.Op = Qi({ width: 0, height: 0 })),
        (this.Up = () => this.av(3)),
        (this.qp = 'left' === t),
        (this.Gu = s.Ec),
        (this.Ps = i),
        (this.um = n),
        (this.dm = e),
        (this.qf = document.createElement('div')),
        (this.qf.style.width = '25px'),
        (this.qf.style.height = '100%'),
        (this.qf.style.overflow = 'hidden'),
        (this.Zp = xs(this.qf, Qi({ width: 16, height: 16 }))),
        this.Zp.subscribeSuggestedBitmapSizeChanged(this.Up);
    }
    m() {
      this.Zp.unsubscribeSuggestedBitmapSizeChanged(this.Up),
        Ss(this.Zp.canvasElement),
        this.Zp.dispose();
    }
    Xf() {
      return this.qf;
    }
    Zf() {
      return this.Op;
    }
    rv(t) {
      ts(this.Op, t) ||
        ((this.Op = t),
        this.Zp.resizeCanvasElement(t),
        (this.qf.style.width = `${t.width}px`),
        (this.qf.style.height = `${t.height}px`),
        (this.St = !0));
    }
    av(t) {
      if (t < 3 && !this.St) return;
      if (0 === this.Op.width || 0 === this.Op.height) return;
      (this.St = !1), this.Zp.applySuggestedBitmapSize();
      const i = rs(this.Zp, { colorSpace: this.Ps.layout.colorSpace });
      null !== i &&
        i.useBitmapCoordinateSpace((t) => {
          this.ov(t), this._v(t);
        });
    }
    Gf() {
      return this.Zp.bitmapSize;
    }
    Jf(t, i, s) {
      const n = this.Gf();
      n.width > 0 && n.height > 0 && t.drawImage(this.Zp.canvasElement, i, s);
    }
    _v({
      context: t,
      bitmapSize: i,
      horizontalPixelRatio: s,
      verticalPixelRatio: n,
    }) {
      if (!this.um()) return;
      t.fillStyle = this.Ps.timeScale.borderColor;
      const e = Math.floor(this.Gu.N().S * s),
        r = Math.floor(this.Gu.N().S * n),
        h = this.qp ? i.width - e : 0;
      t.fillRect(h, 0, e, r);
    }
    ov({ context: t, bitmapSize: i }) {
      B(t, 0, 0, i.width, i.height, this.dm());
    }
  }
  function zs(t) {
    return (i) => i.ia?.(t) ?? [];
  }
  const Os = zs('normal'),
    Ls = zs('top'),
    Ns = zs('bottom');
  class Ws {
    constructor(t, i) {
      (this.fm = null),
        (this.pm = null),
        (this.M = null),
        (this.vm = !1),
        (this.Op = Qi({ width: 0, height: 0 })),
        (this.wm = new o()),
        (this.Np = new it(5)),
        (this.Hp = !1),
        (this.Up = () => {
          this.Hp || this.Dp.Qt().ar();
        }),
        (this.jp = () => {
          this.Hp || this.Dp.Qt().ar();
        }),
        (this.Dp = t),
        (this.o_ = i),
        (this.Ps = t.N().layout),
        (this.yp = document.createElement('tr')),
        (this.gm = document.createElement('td')),
        (this.gm.style.padding = '0'),
        (this.Mm = document.createElement('td')),
        (this.Mm.style.padding = '0'),
        (this.qf = document.createElement('td')),
        (this.qf.style.height = '25px'),
        (this.qf.style.padding = '0'),
        (this.bm = document.createElement('div')),
        (this.bm.style.width = '100%'),
        (this.bm.style.height = '100%'),
        (this.bm.style.position = 'relative'),
        (this.bm.style.overflow = 'hidden'),
        this.qf.appendChild(this.bm),
        (this.Zp = xs(this.bm, Qi({ width: 16, height: 16 }))),
        this.Zp.subscribeSuggestedBitmapSizeChanged(this.Up);
      const s = this.Zp.canvasElement;
      (s.style.position = 'absolute'),
        (s.style.zIndex = '1'),
        (s.style.left = '0'),
        (s.style.top = '0'),
        (this.Gp = xs(this.bm, Qi({ width: 16, height: 16 }))),
        this.Gp.subscribeSuggestedBitmapSizeChanged(this.jp);
      const n = this.Gp.canvasElement;
      (n.style.position = 'absolute'),
        (n.style.zIndex = '2'),
        (n.style.left = '0'),
        (n.style.top = '0'),
        this.yp.appendChild(this.gm),
        this.yp.appendChild(this.qf),
        this.yp.appendChild(this.Mm),
        this.xm(),
        this.Dp.Qt().Eo().i(this.xm.bind(this), this),
        (this.Lf = new us(this.Gp.canvasElement, this, {
          hf: () => !0,
          af: () => !this.Dp.N().handleScroll.horzTouchDrag,
        }));
    }
    m() {
      this.Lf.m(),
        null !== this.fm && this.fm.m(),
        null !== this.pm && this.pm.m(),
        this.Gp.unsubscribeSuggestedBitmapSizeChanged(this.jp),
        Ss(this.Gp.canvasElement),
        this.Gp.dispose(),
        this.Zp.unsubscribeSuggestedBitmapSizeChanged(this.Up),
        Ss(this.Zp.canvasElement),
        this.Zp.dispose();
    }
    Xf() {
      return this.yp;
    }
    Sm() {
      return this.fm;
    }
    Cm() {
      return this.pm;
    }
    bf(t) {
      if (this.vm) return;
      this.vm = !0;
      const i = this.Dp.Qt();
      !i.It().Ki() &&
        this.Dp.N().handleScale.axisPressedMouseMove.time &&
        i.gc(t.localX);
    }
    gf(t) {
      this.bf(t);
    }
    xf() {
      const t = this.Dp.Qt();
      !t.It().Ki() &&
        this.vm &&
        ((this.vm = !1),
        this.Dp.N().handleScale.axisPressedMouseMove.time && t.yc());
    }
    uf(t) {
      const i = this.Dp.Qt();
      !i.It().Ki() &&
        this.Dp.N().handleScale.axisPressedMouseMove.time &&
        i.Pc(t.localX);
    }
    lf(t) {
      this.uf(t);
    }
    pf() {
      this.vm = !1;
      const t = this.Dp.Qt();
      (t.It().Ki() && !this.Dp.N().handleScale.axisPressedMouseMove.time) ||
        t.yc();
    }
    df() {
      this.pf();
    }
    Kd() {
      this.Dp.N().handleScale.axisDoubleClickReset.time && this.Dp.Qt().cn();
    }
    $d() {
      this.Kd();
    }
    if() {
      this.Dp.Qt().N().handleScale.axisPressedMouseMove.time && this.pv(1);
    }
    Ef() {
      this.pv(0);
    }
    Zf() {
      return this.Op;
    }
    Pm() {
      return this.wm;
    }
    ym(t, i, s) {
      ts(this.Op, t) ||
        ((this.Op = t),
        (this.Hp = !0),
        this.Zp.resizeCanvasElement(t),
        this.Gp.resizeCanvasElement(t),
        (this.Hp = !1),
        (this.qf.style.width = `${t.width}px`),
        (this.qf.style.height = `${t.height}px`),
        this.wm.p(t)),
        null !== this.fm && this.fm.rv(Qi({ width: i, height: t.height })),
        null !== this.pm && this.pm.rv(Qi({ width: s, height: t.height }));
    }
    km() {
      const t = this.Tm();
      return Math.ceil(t.S + t.C + t.P + t.A + t.V + t.Rm);
    }
    yt() {
      this.Dp.Qt().It().Ea();
    }
    Gf() {
      return this.Zp.bitmapSize;
    }
    Jf(t, i, s) {
      const n = this.Gf();
      n.width > 0 && n.height > 0 && t.drawImage(this.Zp.canvasElement, i, s);
    }
    av(t) {
      if (0 === t) return;
      const i = { colorSpace: this.Ps.colorSpace };
      if (1 !== t) {
        this.Zp.applySuggestedBitmapSize();
        const s = rs(this.Zp, i);
        null !== s &&
          (s.useBitmapCoordinateSpace((t) => {
            this.ov(t), this._v(t), this.Dm(s, Ns);
          }),
          this.cv(s),
          this.Dm(s, Os)),
          null !== this.fm && this.fm.av(t),
          null !== this.pm && this.pm.av(t);
      }
      this.Gp.applySuggestedBitmapSize();
      const s = rs(this.Gp, i);
      null !== s &&
        (s.useBitmapCoordinateSpace(({ context: t, bitmapSize: i }) => {
          t.clearRect(0, 0, i.width, i.height);
        }),
        this.Em([...this.Dp.Qt().Ys(), this.Dp.Qt()._c()], s),
        this.Dm(s, Ls));
    }
    Dm(t, i) {
      const s = this.Dp.Qt().Ys();
      for (const n of s) ys(i, (i) => Cs(i, t, !1, void 0), n, void 0);
      for (const n of s) ys(i, (i) => Ps(i, t, !1, void 0), n, void 0);
    }
    ov({ context: t, bitmapSize: i }) {
      B(t, 0, 0, i.width, i.height, this.Dp.Qt().Wc());
    }
    _v({ context: t, bitmapSize: i, verticalPixelRatio: s }) {
      if (this.Dp.N().timeScale.borderVisible) {
        t.fillStyle = this.Vm();
        const n = Math.max(1, Math.floor(this.Tm().S * s));
        t.fillRect(0, 0, i.width, n);
      }
    }
    cv(t) {
      const i = this.Dp.Qt().It(),
        s = i.Ea();
      if (!s || 0 === s.length) return;
      const n = this.o_.maxTickMarkWeight(s),
        e = this.Tm(),
        r = i.N();
      r.borderVisible &&
        r.ticksVisible &&
        t.useBitmapCoordinateSpace(
          ({ context: t, horizontalPixelRatio: i, verticalPixelRatio: n }) => {
            (t.strokeStyle = this.Vm()), (t.fillStyle = this.Vm());
            const r = Math.max(1, Math.floor(i)),
              h = Math.floor(0.5 * i);
            t.beginPath();
            const a = Math.round(e.C * n);
            for (let n = s.length; n--; ) {
              const e = Math.round(s[n].coord * i);
              t.rect(e - h, 0, r, a);
            }
            t.fill();
          },
        ),
        t.useMediaCoordinateSpace(({ context: t }) => {
          const i = e.S + e.C + e.A + e.P / 2;
          (t.textAlign = 'center'),
            (t.textBaseline = 'middle'),
            (t.fillStyle = this.H()),
            (t.font = this.nv());
          for (const e of s)
            if (e.weight < n) {
              const s = e.needAlignCoordinate
                ? this.Bm(t, e.coord, e.label)
                : e.coord;
              t.fillText(e.label, s, i);
            }
          this.Dp.N().timeScale.allowBoldLabels && (t.font = this.Im());
          for (const e of s)
            if (e.weight >= n) {
              const s = e.needAlignCoordinate
                ? this.Bm(t, e.coord, e.label)
                : e.coord;
              t.fillText(e.label, s, i);
            }
        });
    }
    Bm(t, i, s) {
      const n = this.Np.Ei(t, s),
        e = n / 2,
        r = Math.floor(i - e) + 0.5;
      return (
        r < 0
          ? (i += Math.abs(0 - r))
          : r + n > this.Op.width && (i -= Math.abs(this.Op.width - (r + n))),
        i
      );
    }
    Em(t, i) {
      const s = this.Tm();
      for (const n of t) for (const t of n.cs()) t.Tt().nt(i, s);
    }
    Vm() {
      return this.Dp.N().timeScale.borderColor;
    }
    H() {
      return this.Ps.textColor;
    }
    W() {
      return this.Ps.fontSize;
    }
    nv() {
      return g(this.W(), this.Ps.fontFamily);
    }
    Im() {
      return g(this.W(), this.Ps.fontFamily, 'bold');
    }
    Tm() {
      null === this.M &&
        (this.M = {
          S: 1,
          O: NaN,
          A: NaN,
          V: NaN,
          Ji: NaN,
          C: 5,
          P: NaN,
          k: '',
          Gi: new it(),
          Rm: 0,
        });
      const t = this.M,
        i = this.nv();
      if (t.k !== i) {
        const s = this.W();
        (t.P = s),
          (t.k = i),
          (t.A = (3 * s) / 12),
          (t.V = (3 * s) / 12),
          (t.Ji = (9 * s) / 12),
          (t.O = 0),
          (t.Rm = (4 * s) / 12),
          t.Gi.Vn();
      }
      return this.M;
    }
    pv(t) {
      this.qf.style.cursor = 1 === t ? 'ew-resize' : 'default';
    }
    xm() {
      const t = this.Dp.Qt(),
        i = t.N();
      i.leftPriceScale.visible ||
        null === this.fm ||
        (this.gm.removeChild(this.fm.Xf()), this.fm.m(), (this.fm = null)),
        i.rightPriceScale.visible ||
          null === this.pm ||
          (this.Mm.removeChild(this.pm.Xf()), this.pm.m(), (this.pm = null));
      const s = { Ec: this.Dp.Qt().Ec() },
        n = () => i.leftPriceScale.borderVisible && t.It().N().borderVisible,
        e = () => t.Wc();
      i.leftPriceScale.visible &&
        null === this.fm &&
        ((this.fm = new As('left', i, s, n, e)),
        this.gm.appendChild(this.fm.Xf())),
        i.rightPriceScale.visible &&
          null === this.pm &&
          ((this.pm = new As('right', i, s, n, e)),
          this.Mm.appendChild(this.pm.Xf()));
    }
  }
  const Fs =
    !!hs &&
    !!navigator.userAgentData &&
    navigator.userAgentData.brands.some((t) => t.brand.includes('Chromium')) &&
    !!hs &&
    (navigator?.userAgentData?.platform
      ? 'Windows' === navigator.userAgentData.platform
      : navigator.userAgent.toLowerCase().indexOf('win') >= 0);
  class Hs {
    constructor(t, i, s) {
      var n;
      (this.Am = []),
        (this.zm = []),
        (this.Om = 0),
        (this.sl = 0),
        (this.Mo = 0),
        (this.Lm = 0),
        (this.Nm = 0),
        (this.Wm = null),
        (this.Fm = !1),
        (this.xv = new o()),
        (this.Sv = new o()),
        (this.Ku = new o()),
        (this.Hm = null),
        (this.Um = null),
        (this.Rp = t),
        (this.Ps = i),
        (this.o_ = s),
        (this.yp = document.createElement('div')),
        this.yp.classList.add('tv-lightweight-charts'),
        (this.yp.style.overflow = 'hidden'),
        (this.yp.style.direction = 'ltr'),
        (this.yp.style.width = '100%'),
        (this.yp.style.height = '100%'),
        ((n = this.yp).style.userSelect = 'none'),
        (n.style.webkitUserSelect = 'none'),
        (n.style.msUserSelect = 'none'),
        (n.style.MozUserSelect = 'none'),
        (n.style.webkitTapHighlightColor = 'transparent'),
        (this.$m = document.createElement('table')),
        this.$m.setAttribute('cellspacing', '0'),
        this.yp.appendChild(this.$m),
        (this.jm = this.qm.bind(this)),
        Us(this.Ps) && this.Ym(!0),
        (this.ts = new Ii(this.Zu.bind(this), this.Ps, s)),
        this.Qt().uc().i(this.Km.bind(this), this),
        (this.Xm = new Ws(this, this.o_)),
        this.$m.appendChild(this.Xm.Xf());
      const e = i.autoSize && this.Zm();
      let r = this.Ps.width,
        h = this.Ps.height;
      if (e || 0 === r || 0 === h) {
        const i = t.getBoundingClientRect();
        (r = r || i.width), (h = h || i.height);
      }
      this.Gm(r, h),
        this.Jm(),
        t.appendChild(this.yp),
        this.Qm(),
        this.ts.It().Vu().i(this.ts.Bh.bind(this.ts), this),
        this.ts.Eo().i(this.ts.Bh.bind(this.ts), this);
    }
    Qt() {
      return this.ts;
    }
    N() {
      return this.Ps;
    }
    Uf() {
      return this.Am;
    }
    tw() {
      return this.Xm;
    }
    m() {
      this.Ym(!1),
        0 !== this.Om && window.cancelAnimationFrame(this.Om),
        this.ts.uc().u(this),
        this.ts.It().Vu().u(this),
        this.ts.Eo().u(this),
        this.ts.m();
      for (const t of this.Am)
        this.$m.removeChild(t.Xf()), t.Kv().u(this), t.Xv().u(this), t.m();
      this.Am = [];
      for (const t of this.zm) this.iw(t);
      (this.zm = []),
        a(this.Xm).m(),
        null !== this.yp.parentElement &&
          this.yp.parentElement.removeChild(this.yp),
        this.Ku.m(),
        this.xv.m(),
        this.Sv.m(),
        this.sw();
    }
    Gm(t, i, s = !1) {
      if (this.sl === i && this.Mo === t) return;
      const n = (function (t) {
        const i = Math.floor(t.width),
          s = Math.floor(t.height);
        return Qi({ width: i - (i % 2), height: s - (s % 2) });
      })(Qi({ width: t, height: i }));
      (this.sl = n.height), (this.Mo = n.width);
      const e = this.sl + 'px',
        r = this.Mo + 'px';
      (a(this.yp).style.height = e),
        (a(this.yp).style.width = r),
        (this.$m.style.height = e),
        (this.$m.style.width = r),
        s ? this.nw(Y.gn(), performance.now()) : this.ts.Bh();
    }
    av(t) {
      void 0 === t && (t = Y.gn());
      for (let i = 0; i < this.Am.length; i++) this.Am[i].av(t.en(i).tn);
      this.Ps.timeScale.visible && this.Xm.av(t.nn());
    }
    hr(t) {
      const i = Us(this.Ps);
      this.ts.hr(t);
      const s = Us(this.Ps);
      s !== i && this.Ym(s),
        t.layout?.panes && this.ew(),
        this.Qm(),
        this.rw(t);
    }
    Kv() {
      return this.xv;
    }
    Xv() {
      return this.Sv;
    }
    uc() {
      return this.Ku;
    }
    hw() {
      null !== this.Wm &&
        (this.nw(this.Wm, performance.now()), (this.Wm = null));
      const t = this.aw(null),
        i = document.createElement('canvas');
      (i.width = t.width), (i.height = t.height);
      const s = a(i.getContext('2d'));
      return this.aw(s), i;
    }
    lw(t) {
      if ('left' === t && !this.ow()) return 0;
      if ('right' === t && !this._w()) return 0;
      if (0 === this.Am.length) return 0;
      return a('left' === t ? this.Am[0].sm() : this.Am[0].nm()).hv();
    }
    uw() {
      return this.Ps.autoSize && null !== this.Hm;
    }
    tp() {
      return this.yp;
    }
    cw(t) {
      (this.Um = t),
        this.Um
          ? this.tp().style.setProperty('cursor', t)
          : this.tp().style.removeProperty('cursor');
    }
    dw() {
      return this.Um;
    }
    fw(t) {
      return h(this.Am[t]).Zf();
    }
    ew() {
      this.zm.forEach((t) => {
        t.yt();
      });
    }
    rw(t) {
      (void 0 !== t.autoSize ||
        !this.Hm ||
        (void 0 === t.width && void 0 === t.height)) &&
        (t.autoSize && !this.Hm && this.Zm(),
        !1 === t.autoSize && null !== this.Hm && this.sw(),
        t.autoSize ||
          (void 0 === t.width && void 0 === t.height) ||
          this.Gm(t.width || this.Mo, t.height || this.sl));
    }
    aw(t) {
      let i = 0,
        s = 0;
      const n = this.Am[0],
        e = (i, s) => {
          let n = 0;
          for (let e = 0; e < this.Am.length; e++) {
            const r = this.Am[e],
              h = a('left' === i ? r.sm() : r.nm()),
              l = h.Gf();
            if (
              (null !== t && h.Jf(t, s, n),
              (n += l.height),
              e < this.Am.length - 1)
            ) {
              const i = this.zm[e],
                r = i.Gf();
              null !== t && i.Jf(t, s, n), (n += r.height);
            }
          }
        };
      if (this.ow()) {
        e('left', 0);
        i += a(n.sm()).Gf().width;
      }
      for (let n = 0; n < this.Am.length; n++) {
        const e = this.Am[n],
          r = e.Gf();
        if (
          (null !== t && e.Jf(t, i, s), (s += r.height), n < this.Am.length - 1)
        ) {
          const e = this.zm[n],
            r = e.Gf();
          null !== t && e.Jf(t, i, s), (s += r.height);
        }
      }
      if (((i += n.Gf().width), this._w())) {
        e('right', i);
        i += a(n.nm()).Gf().width;
      }
      const r = (i, s, n) => {
        a('left' === i ? this.Xm.Sm() : this.Xm.Cm()).Jf(a(t), s, n);
      };
      if (this.Ps.timeScale.visible) {
        const i = this.Xm.Gf();
        if (null !== t) {
          let e = 0;
          this.ow() && (r('left', e, s), (e = a(n.sm()).Gf().width)),
            this.Xm.Jf(t, e, s),
            (e += i.width),
            this._w() && r('right', e, s);
        }
        s += i.height;
      }
      return Qi({ width: i, height: s });
    }
    pw() {
      let t = 0,
        i = 0,
        s = 0;
      for (const n of this.Am)
        this.ow() &&
          (i = Math.max(
            i,
            a(n.sm()).sv(),
            this.Ps.leftPriceScale.minimumWidth,
          )),
          this._w() &&
            (s = Math.max(
              s,
              a(n.nm()).sv(),
              this.Ps.rightPriceScale.minimumWidth,
            )),
          (t += n.Vo());
      (i = os(i)), (s = os(s));
      const n = this.Mo,
        e = this.sl,
        r = Math.max(n - i - s, 0),
        h = 1 * this.zm.length,
        l = this.Ps.timeScale.visible;
      let o = l ? Math.max(this.Xm.km(), this.Ps.timeScale.minimumHeight) : 0;
      var _;
      o = (_ = o) + (_ % 2);
      const u = h + o,
        c = e < u ? 0 : e - u,
        d = c / t;
      let f = 0;
      const p = window.devicePixelRatio || 1;
      for (let t = 0; t < this.Am.length; ++t) {
        const n = this.Am[t];
        n.zv(this.ts.$s()[t]);
        let e = 0,
          h = 0;
        (h =
          t === this.Am.length - 1
            ? Math.ceil((c - f) * p) / p
            : Math.round(n.Vo() * d * p) / p),
          (e = Math.max(h, 2)),
          (f += e),
          n.rv(Qi({ width: r, height: e })),
          this.ow() && n.Gv(i, 'left'),
          this._w() && n.Gv(s, 'right'),
          n.hp() && this.ts.cc(n.hp(), e);
      }
      this.Xm.ym(Qi({ width: l ? r : 0, height: o }), l ? i : 0, l ? s : 0),
        this.ts.Io(r),
        this.Lm !== i && (this.Lm = i),
        this.Nm !== s && (this.Nm = s);
    }
    Ym(t) {
      t
        ? this.yp.addEventListener('wheel', this.jm, { passive: !1 })
        : this.yp.removeEventListener('wheel', this.jm);
    }
    mw(t) {
      switch (t.deltaMode) {
        case t.DOM_DELTA_PAGE:
          return 120;
        case t.DOM_DELTA_LINE:
          return 32;
      }
      return Fs ? 1 / window.devicePixelRatio : 1;
    }
    qm(t) {
      if (
        !(
          (0 !== t.deltaX && this.Ps.handleScroll.mouseWheel) ||
          (0 !== t.deltaY && this.Ps.handleScale.mouseWheel)
        )
      )
        return;
      const i = this.mw(t),
        s = (i * t.deltaX) / 100,
        n = (-i * t.deltaY) / 100;
      if (
        (t.cancelable && t.preventDefault(),
        0 !== n && this.Ps.handleScale.mouseWheel)
      ) {
        const i = Math.sign(n) * Math.min(1, Math.abs(n)),
          s = t.clientX - this.yp.getBoundingClientRect().left;
        this.Qt().Mc(s, i);
      }
      0 !== s && this.Ps.handleScroll.mouseWheel && this.Qt().bc(-80 * s);
    }
    nw(t, i) {
      const s = t.nn();
      3 === s && this.ww(),
        (3 !== s && 2 !== s) ||
          (this.gw(t),
          this.Mw(t, i),
          this.Xm.yt(),
          this.Am.forEach((t) => {
            t.Lv();
          }),
          3 === this.Wm?.nn() &&
            (this.Wm.vn(t),
            this.ww(),
            this.gw(this.Wm),
            this.Mw(this.Wm, i),
            (t = this.Wm),
            (this.Wm = null))),
        this.av(t);
    }
    Mw(t, i) {
      for (const s of t.pn()) this.mn(s, i);
    }
    gw(t) {
      const i = this.ts.$s();
      for (let s = 0; s < i.length; s++) t.en(s).sn && i[s].Go();
    }
    mn(t, i) {
      const s = this.ts.It();
      switch (t.an) {
        case 0:
          s.Iu();
          break;
        case 1:
          s.Au(t.Ft);
          break;
        case 2:
          s.dn(t.Ft);
          break;
        case 3:
          s.fn(t.Ft);
          break;
        case 4:
          s.bu();
          break;
        case 5:
          t.Ft.Tu(i) || s.fn(t.Ft.Ru(i));
      }
    }
    Zu(t) {
      null !== this.Wm ? this.Wm.vn(t) : (this.Wm = t),
        this.Fm ||
          ((this.Fm = !0),
          (this.Om = window.requestAnimationFrame((t) => {
            if (((this.Fm = !1), (this.Om = 0), null !== this.Wm)) {
              const i = this.Wm;
              (this.Wm = null), this.nw(i, t);
              for (const s of i.pn())
                if (5 === s.an && !s.Ft.Tu(t)) {
                  this.Qt()._n(s.Ft);
                  break;
                }
            }
          })));
    }
    ww() {
      this.Jm();
    }
    iw(t) {
      this.$m.removeChild(t.Xf()), t.m();
    }
    Jm() {
      const t = this.ts.$s(),
        i = t.length,
        s = this.Am.length;
      for (let t = i; t < s; t++) {
        const t = h(this.Am.pop());
        this.$m.removeChild(t.Xf()), t.Kv().u(this), t.Xv().u(this), t.m();
        const i = this.zm.pop();
        void 0 !== i && this.iw(i);
      }
      for (let n = s; n < i; n++) {
        const i = new Is(this, t[n]);
        if (
          (i.Kv().i(this.bw.bind(this, i), this),
          i.Xv().i(this.xw.bind(this, i), this),
          this.Am.push(i),
          n > 0)
        ) {
          const t = new ms(this, n - 1, n);
          this.zm.push(t), this.$m.insertBefore(t.Xf(), this.Xm.Xf());
        }
        this.$m.insertBefore(i.Xf(), this.Xm.Xf());
      }
      for (let s = 0; s < i; s++) {
        const i = t[s],
          n = this.Am[s];
        n.hp() !== i ? n.zv(i) : n.Av();
      }
      this.Qm(), this.pw();
    }
    Sw(t, i, s, n) {
      const e = new Map();
      if (null !== t) {
        this.ts.Ys().forEach((i) => {
          const s = i.Xs().Wr(t);
          null !== s && e.set(i, s);
        });
      }
      let r;
      if (null !== t) {
        const i = this.ts.It().ss(t)?.originalTime;
        void 0 !== i && (r = i);
      }
      const h = this.Qt().hc(),
        a = null !== h && h.n_ instanceof Ut ? h.n_ : void 0,
        l = null !== h && void 0 !== h.e_ ? h.e_.Kn : void 0,
        o = this.Cw(n);
      return {
        Pw: r,
        Re: t ?? void 0,
        yw: i ?? void 0,
        kw: -1 !== o ? o : void 0,
        Tw: a,
        Rw: e,
        Dw: l,
        Ew: s ?? void 0,
      };
    }
    Cw(t) {
      let i = -1;
      if (t) i = this.Am.indexOf(t);
      else {
        const t = this.Qt()._c().Us();
        null !== t && (i = this.Qt().$s().indexOf(t));
      }
      return i;
    }
    bw(t, i, s, n) {
      this.xv.p(() => this.Sw(i, s, n, t));
    }
    xw(t, i, s, n) {
      this.Sv.p(() => this.Sw(i, s, n, t));
    }
    Km(t, i, s) {
      this.cw(this.Qt().hc()?.h_ ?? null), this.Ku.p(() => this.Sw(t, i, s));
    }
    Qm() {
      const t = this.Ps.timeScale.visible ? '' : 'none';
      this.Xm.Xf().style.display = t;
    }
    ow() {
      return this.Am[0].hp().Fo().N().visible;
    }
    _w() {
      return this.Am[0].hp().Ho().N().visible;
    }
    Zm() {
      return (
        'ResizeObserver' in window &&
        ((this.Hm = new ResizeObserver((t) => {
          const i = t[t.length - 1];
          i && this.Gm(i.contentRect.width, i.contentRect.height);
        })),
        this.Hm.observe(this.Rp, { box: 'border-box' }),
        !0)
      );
    }
    sw() {
      null !== this.Hm && this.Hm.disconnect(), (this.Hm = null);
    }
  }
  function Us(t) {
    return Boolean(t.handleScroll.mouseWheel || t.handleScale.mouseWheel);
  }
  function $s(t) {
    return void 0 === t.open && void 0 === t.value;
  }
  function js(t) {
    return (
      (function (t) {
        return void 0 !== t.open;
      })(t) ||
      (function (t) {
        return void 0 !== t.value;
      })(t)
    );
  }
  function qs(t, i, s, n) {
    const e = s.value,
      r = { Re: i, wt: t, Ft: [e, e, e, e], Pw: n };
    return void 0 !== s.color && (r.R = s.color), r;
  }
  function Ys(t, i, s, n) {
    const e = s.value,
      r = { Re: i, wt: t, Ft: [e, e, e, e], Pw: n };
    return (
      void 0 !== s.lineColor && (r.vt = s.lineColor),
      void 0 !== s.topColor && (r.mr = s.topColor),
      void 0 !== s.bottomColor && (r.wr = s.bottomColor),
      r
    );
  }
  function Ks(t, i, s, n) {
    const e = s.value,
      r = { Re: i, wt: t, Ft: [e, e, e, e], Pw: n };
    return (
      void 0 !== s.topLineColor && (r.gr = s.topLineColor),
      void 0 !== s.bottomLineColor && (r.Mr = s.bottomLineColor),
      void 0 !== s.topFillColor1 && (r.br = s.topFillColor1),
      void 0 !== s.topFillColor2 && (r.Sr = s.topFillColor2),
      void 0 !== s.bottomFillColor1 && (r.Cr = s.bottomFillColor1),
      void 0 !== s.bottomFillColor2 && (r.Pr = s.bottomFillColor2),
      r
    );
  }
  function Xs(t, i, s, n) {
    const e = { Re: i, wt: t, Ft: [s.open, s.high, s.low, s.close], Pw: n };
    return void 0 !== s.color && (e.R = s.color), e;
  }
  function Zs(t, i, s, n) {
    const e = { Re: i, wt: t, Ft: [s.open, s.high, s.low, s.close], Pw: n };
    return (
      void 0 !== s.color && (e.R = s.color),
      void 0 !== s.borderColor && (e.Ht = s.borderColor),
      void 0 !== s.wickColor && (e.vr = s.wickColor),
      e
    );
  }
  function Gs(t, i, s, n, e) {
    const r = h(e)(s),
      a = Math.max(...r),
      l = Math.min(...r),
      o = r[r.length - 1],
      _ = [o, a, l, o],
      { time: u, color: c, ...d } = s;
    return { Re: i, wt: t, Ft: _, Pw: n, se: d, R: c };
  }
  function Js(t) {
    return void 0 !== t.Ft;
  }
  function Qs(t, i) {
    return void 0 !== i.customValues && (t.Vw = i.customValues), t;
  }
  function tn(t) {
    return (i, s, n, e, r, h) =>
      (function (t, i) {
        return i ? i(t) : $s(t);
      })(n, h)
        ? Qs({ wt: i, Re: s, Pw: e }, n)
        : Qs(t(i, s, n, e, r), n);
  }
  function sn(t) {
    return {
      Candlestick: tn(Zs),
      Bar: tn(Xs),
      Area: tn(Ys),
      Baseline: tn(Ks),
      Histogram: tn(qs),
      Line: tn(qs),
      Custom: tn(Gs),
    }[t];
  }
  function nn(t) {
    return { Re: 0, Bw: new Map(), Hh: t };
  }
  function en(t, i) {
    if (void 0 !== t && 0 !== t.length)
      return { Iw: i.key(t[0].wt), Aw: i.key(t[t.length - 1].wt) };
  }
  function rn(t) {
    let i;
    return (
      t.forEach((t) => {
        void 0 === i && (i = t.Pw);
      }),
      h(i)
    );
  }
  class hn {
    constructor(t) {
      (this.zw = new Map()),
        (this.Ow = new Map()),
        (this.Lw = new Map()),
        (this.Nw = []),
        (this.o_ = t);
    }
    m() {
      this.zw.clear(), this.Ow.clear(), this.Lw.clear(), (this.Nw = []);
    }
    Ww(t, i) {
      let s = 0 !== this.zw.size,
        n = !1;
      const e = this.Ow.get(t);
      if (void 0 !== e)
        if (1 === this.Ow.size) (s = !1), (n = !0), this.zw.clear();
        else for (const i of this.Nw) i.pointData.Bw.delete(t) && (n = !0);
      let r = [];
      if (0 !== i.length) {
        const s = i.map((t) => t.time),
          e = this.o_.createConverterToInternalObj(i),
          h = sn(t.Rr()),
          a = t.da(),
          l = t.pa();
        r = i.map((i, r) => {
          const o = e(i.time),
            _ = this.o_.key(o);
          let u = this.zw.get(_);
          void 0 === u && ((u = nn(o)), this.zw.set(_, u), (n = !0));
          const c = h(o, u.Re, i, s[r], a, l);
          return u.Bw.set(t, c), c;
        });
      }
      s && this.Fw(), this.Hw(t, r);
      let h = -1;
      if (n) {
        const t = [];
        this.zw.forEach((i) => {
          t.push({
            timeWeight: 0,
            time: i.Hh,
            pointData: i,
            originalTime: rn(i.Bw),
          });
        }),
          t.sort((t, i) => this.o_.key(t.time) - this.o_.key(i.time)),
          (h = this.Uw(t));
      }
      return this.$w(
        t,
        h,
        (function (t, i, s) {
          const n = en(t, s),
            e = en(i, s);
          if (void 0 !== n && void 0 !== e)
            return { jw: !1, zh: n.Aw >= e.Aw && n.Iw >= e.Iw };
        })(this.Ow.get(t), e, this.o_),
      );
    }
    Ic(t) {
      return this.Ww(t, []);
    }
    qw(t, i, s) {
      const n = i;
      !(function (t) {
        void 0 === t.Pw && (t.Pw = t.time);
      })(n),
        this.o_.preprocessData(i);
      const e = this.o_.createConverterToInternalObj([i])(i.time),
        r = this.Lw.get(t);
      if (!s && void 0 !== r && this.o_.key(e) < this.o_.key(r))
        throw new Error(
          `Cannot update oldest data, last time=${r}, new time=${e}`,
        );
      let h = this.zw.get(this.o_.key(e));
      if (s && void 0 === h)
        throw new Error(
          'Cannot update non-existing data point when historicalUpdate is true',
        );
      const a = void 0 === h;
      void 0 === h && ((h = nn(e)), this.zw.set(this.o_.key(e), h));
      const l = sn(t.Rr()),
        o = t.da(),
        _ = t.pa(),
        u = l(e, h.Re, i, n.Pw, o, _);
      h.Bw.set(t, u), s ? this.Yw(t, u, h.Re) : this.Kw(t, u);
      const c = { zh: Js(u), jw: s };
      if (!a) return this.$w(t, -1, c);
      const d = {
          timeWeight: 0,
          time: h.Hh,
          pointData: h,
          originalTime: rn(h.Bw),
        },
        f = xt(this.Nw, this.o_.key(d.time), (t, i) => this.o_.key(t.time) < i);
      this.Nw.splice(f, 0, d);
      for (let t = f; t < this.Nw.length; ++t) an(this.Nw[t].pointData, t);
      return this.o_.fillWeightsForPoints(this.Nw, f), this.$w(t, f, c);
    }
    Kw(t, i) {
      let s = this.Ow.get(t);
      void 0 === s && ((s = []), this.Ow.set(t, s));
      const n = 0 !== s.length ? s[s.length - 1] : null;
      null === n || this.o_.key(i.wt) > this.o_.key(n.wt)
        ? Js(i) && s.push(i)
        : Js(i)
        ? (s[s.length - 1] = i)
        : s.splice(-1, 1),
        this.Lw.set(t, i.wt);
    }
    Yw(t, i, s) {
      const n = this.Ow.get(t);
      if (void 0 === n) return;
      const e = xt(n, s, (t, i) => t.Re < i);
      Js(i) ? (n[e] = i) : n.splice(e, 1);
    }
    Hw(t, i) {
      0 !== i.length
        ? (this.Ow.set(t, i.filter(Js)), this.Lw.set(t, i[i.length - 1].wt))
        : (this.Ow.delete(t), this.Lw.delete(t));
    }
    Fw() {
      for (const t of this.Nw)
        0 === t.pointData.Bw.size && this.zw.delete(this.o_.key(t.time));
    }
    Uw(t) {
      let i = -1;
      for (let s = 0; s < this.Nw.length && s < t.length; ++s) {
        const n = this.Nw[s],
          e = t[s];
        if (this.o_.key(n.time) !== this.o_.key(e.time)) {
          i = s;
          break;
        }
        (e.timeWeight = n.timeWeight), an(e.pointData, s);
      }
      if (
        (-1 === i &&
          this.Nw.length !== t.length &&
          (i = Math.min(this.Nw.length, t.length)),
        -1 === i)
      )
        return -1;
      for (let s = i; s < t.length; ++s) an(t[s].pointData, s);
      return this.o_.fillWeightsForPoints(t, i), (this.Nw = t), i;
    }
    Xw() {
      if (0 === this.Ow.size) return null;
      let t = 0;
      return (
        this.Ow.forEach((i) => {
          0 !== i.length && (t = Math.max(t, i[i.length - 1].Re));
        }),
        t
      );
    }
    $w(t, i, s) {
      const n = { Lo: new Map(), It: { ou: this.Xw() } };
      if (-1 !== i)
        this.Ow.forEach((i, e) => {
          n.Lo.set(e, { se: i, Zw: e === t ? s : void 0 });
        }),
          this.Ow.has(t) || n.Lo.set(t, { se: [], Zw: s }),
          (n.It.Gw = this.Nw),
          (n.It.Jw = i);
      else {
        const i = this.Ow.get(t);
        n.Lo.set(t, { se: i || [], Zw: s });
      }
      return n;
    }
  }
  function an(t, i) {
    (t.Re = i),
      t.Bw.forEach((t) => {
        t.Re = i;
      });
  }
  function ln(t, i) {
    return t.wt < i;
  }
  function on(t, i) {
    return i < t.wt;
  }
  function _n(t, i, s) {
    const n = i.Uh(),
      e = i.bi(),
      r = xt(t, n, ln),
      h = St(t, e, on);
    if (!s) return { from: r, to: h };
    let a = r,
      l = h;
    return (
      r > 0 && r < t.length && t[r].wt >= n && (a = r - 1),
      h > 0 && h < t.length && t[h - 1].wt <= e && (l = h + 1),
      { from: a, to: l }
    );
  }
  class un {
    constructor(t, i, s) {
      (this.Qw = !0),
        (this.tg = !0),
        (this.ig = !0),
        (this.sg = []),
        (this.ng = null),
        (this.Jn = t),
        (this.Qn = i),
        (this.eg = s);
    }
    yt(t) {
      (this.Qw = !0),
        'data' === t && (this.tg = !0),
        'options' === t && (this.ig = !0);
    }
    Tt() {
      return this.Jn.Et()
        ? (this.rg(), null === this.ng ? null : this.hg)
        : null;
    }
    ag() {
      this.sg = this.sg.map((t) => ({ ...t, ...this.Jn.Rh().Dr(t.wt) }));
    }
    lg() {
      this.ng = null;
    }
    rg() {
      this.tg && (this.og(), (this.tg = !1)),
        this.ig && (this.ag(), (this.ig = !1)),
        this.Qw && (this._g(), (this.Qw = !1));
    }
    _g() {
      const t = this.Jn.Wt(),
        i = this.Qn.It();
      if ((this.lg(), i.Ki() || t.Ki())) return;
      const s = i.Pe();
      if (null === s) return;
      if (0 === this.Jn.Xs().zr()) return;
      const n = this.Jn.zt();
      null !== n &&
        ((this.ng = _n(this.sg, s, this.eg)), this.ug(t, i, n.Ft), this.cg());
    }
  }
  class cn {
    constructor(t, i) {
      (this.dg = t), (this.qi = i);
    }
    nt(t, i, s) {
      this.dg.draw(t, this.qi, i, s);
    }
  }
  class dn extends un {
    constructor(t, i, s) {
      super(t, i, !1),
        (this.sh = s),
        (this.hg = new cn(this.sh.renderer(), (i) => {
          const s = t.zt();
          return null === s ? null : t.Wt().Nt(i, s.Ft);
        }));
    }
    fa(t) {
      return this.sh.priceValueBuilder(t);
    }
    va(t) {
      return this.sh.isWhitespace(t);
    }
    og() {
      const t = this.Jn.Rh();
      this.sg = this.Jn.Xs()
        .Hr()
        .map((i) => ({ wt: i.Re, _t: NaN, ...t.Dr(i.Re), fg: i.se }));
    }
    ug(t, i) {
      i._u(this.sg, m(this.ng));
    }
    cg() {
      this.sh.update(
        {
          bars: this.sg.map(fn),
          barSpacing: this.Qn.It().vu(),
          visibleRange: this.ng,
        },
        this.Jn.N(),
      );
    }
  }
  function fn(t) {
    return { x: t._t, time: t.wt, originalData: t.fg, barColor: t.cr };
  }
  const pn = { color: '#2196f3' },
    vn = (t, i, s) => {
      const n = l(s);
      return new dn(t, i, n);
    };
  function mn(t) {
    const i = { value: t.Ft[3], time: t.Pw };
    return void 0 !== t.Vw && (i.customValues = t.Vw), i;
  }
  function wn(t) {
    const i = mn(t);
    return void 0 !== t.R && (i.color = t.R), i;
  }
  function gn(t) {
    const i = mn(t);
    return (
      void 0 !== t.vt && (i.lineColor = t.vt),
      void 0 !== t.mr && (i.topColor = t.mr),
      void 0 !== t.wr && (i.bottomColor = t.wr),
      i
    );
  }
  function Mn(t) {
    const i = mn(t);
    return (
      void 0 !== t.gr && (i.topLineColor = t.gr),
      void 0 !== t.Mr && (i.bottomLineColor = t.Mr),
      void 0 !== t.br && (i.topFillColor1 = t.br),
      void 0 !== t.Sr && (i.topFillColor2 = t.Sr),
      void 0 !== t.Cr && (i.bottomFillColor1 = t.Cr),
      void 0 !== t.Pr && (i.bottomFillColor2 = t.Pr),
      i
    );
  }
  function bn(t) {
    const i = {
      open: t.Ft[0],
      high: t.Ft[1],
      low: t.Ft[2],
      close: t.Ft[3],
      time: t.Pw,
    };
    return void 0 !== t.Vw && (i.customValues = t.Vw), i;
  }
  function xn(t) {
    const i = bn(t);
    return void 0 !== t.R && (i.color = t.R), i;
  }
  function Sn(t) {
    const i = bn(t),
      { R: s, Ht: n, vr: e } = t;
    return (
      void 0 !== s && (i.color = s),
      void 0 !== n && (i.borderColor = n),
      void 0 !== e && (i.wickColor = e),
      i
    );
  }
  function Cn(t) {
    return {
      Area: gn,
      Line: wn,
      Baseline: Mn,
      Histogram: wn,
      Bar: xn,
      Candlestick: Sn,
      Custom: Pn,
    }[t];
  }
  function Pn(t) {
    const i = t.Pw;
    return { ...t.se, time: i };
  }
  const yn = {
      vertLine: {
        color: '#9598A1',
        width: 1,
        style: 3,
        visible: !0,
        labelVisible: !0,
        labelBackgroundColor: '#131722',
      },
      horzLine: {
        color: '#9598A1',
        width: 1,
        style: 3,
        visible: !0,
        labelVisible: !0,
        labelBackgroundColor: '#131722',
      },
      mode: 1,
    },
    kn = {
      vertLines: { color: '#D6DCDE', style: 0, visible: !0 },
      horzLines: { color: '#D6DCDE', style: 0, visible: !0 },
    },
    Tn = {
      background: { type: 'solid', color: '#FFFFFF' },
      textColor: '#191919',
      fontSize: 12,
      fontFamily: w,
      panes: {
        enableResize: !0,
        separatorColor: '#E0E3EB',
        separatorHoverColor: 'rgba(178, 181, 189, 0.2)',
      },
      attributionLogo: !0,
      colorSpace: 'srgb',
      colorParsers: [],
    },
    Rn = {
      autoScale: !0,
      mode: 0,
      invertScale: !1,
      alignLabels: !0,
      borderVisible: !0,
      borderColor: '#2B2B43',
      entireTextOnly: !1,
      visible: !1,
      ticksVisible: !1,
      scaleMargins: { bottom: 0.1, top: 0.2 },
      minimumWidth: 0,
      ensureEdgeTickMarksVisible: !1,
    },
    Dn = {
      rightOffset: 0,
      barSpacing: 6,
      minBarSpacing: 0.5,
      maxBarSpacing: 0,
      fixLeftEdge: !1,
      fixRightEdge: !1,
      lockVisibleTimeRangeOnResize: !1,
      rightBarStaysOnScroll: !1,
      borderVisible: !0,
      borderColor: '#2B2B43',
      visible: !0,
      timeVisible: !1,
      secondsVisible: !0,
      shiftVisibleRangeOnNewBar: !0,
      allowShiftVisibleRangeOnWhitespaceReplacement: !1,
      ticksVisible: !1,
      uniformDistribution: !1,
      minimumHeight: 0,
      allowBoldLabels: !0,
      ignoreWhitespaceIndices: !1,
    };
  function En() {
    return {
      addDefaultPane: !0,
      width: 0,
      height: 0,
      autoSize: !1,
      layout: Tn,
      crosshair: yn,
      grid: kn,
      overlayPriceScales: { ...Rn },
      leftPriceScale: { ...Rn, visible: !1 },
      rightPriceScale: { ...Rn, visible: !0 },
      timeScale: Dn,
      localization: {
        locale: hs ? navigator.language : '',
        dateFormat: "dd MMM 'yy",
      },
      handleScroll: {
        mouseWheel: !0,
        pressedMouseMove: !0,
        horzTouchDrag: !0,
        vertTouchDrag: !0,
      },
      handleScale: {
        axisPressedMouseMove: { time: !0, price: !0 },
        axisDoubleClickReset: { time: !0, price: !0 },
        mouseWheel: !0,
        pinch: !0,
      },
      kineticScroll: { mouse: !1, touch: !0 },
      trackingMode: { exitMode: 1 },
    };
  }
  class Vn {
    constructor(t, i, s) {
      (this.Ff = t), (this.pg = i), (this.vg = s ?? 0);
    }
    applyOptions(t) {
      this.Ff.Qt().lc(this.pg, t, this.vg);
    }
    options() {
      return this.qi().N();
    }
    width() {
      return q(this.pg) ? this.Ff.lw(this.pg) : 0;
    }
    setVisibleRange(t) {
      this.setAutoScale(!1), this.qi().Fl(new dt(t.from, t.to));
    }
    getVisibleRange() {
      const t = this.qi().Qe();
      return null === t ? null : { from: t.$e(), to: t.je() };
    }
    setAutoScale(t) {
      this.applyOptions({ autoScale: t });
    }
    qi() {
      return a(this.Ff.Qt().oc(this.pg, this.vg)).Wt;
    }
  }
  class Bn {
    constructor(t, i, s, n) {
      (this.Ff = t), (this.Pt = s), (this.mg = i), (this.wg = n);
    }
    getHeight() {
      return this.Pt.$t();
    }
    setHeight(t) {
      const i = this.Ff.Qt(),
        s = i.Hc(this.Pt);
      i.fc(s, t);
    }
    getStretchFactor() {
      return this.Pt.Vo();
    }
    setStretchFactor(t) {
      this.Pt.Bo(t), this.Ff.Qt().Bh();
    }
    paneIndex() {
      return this.Ff.Qt().Hc(this.Pt);
    }
    moveTo(t) {
      const i = this.paneIndex();
      i !== t &&
        (r(t >= 0 && t < this.Ff.Uf().length, 'Invalid pane index'),
        this.Ff.Qt().mc(i, t));
    }
    getSeries() {
      return this.Pt.Lo().map((t) => this.mg(t)) ?? [];
    }
    getHTMLElement() {
      const t = this.Ff.Uf();
      return t && 0 !== t.length && t[this.paneIndex()]
        ? t[this.paneIndex()].Xf()
        : null;
    }
    attachPrimitive(t) {
      this.Pt.ua(t),
        t.attached &&
          t.attached({
            chart: this.wg,
            requestUpdate: () => this.Pt.Qt().Bh(),
          });
    }
    detachPrimitive(t) {
      this.Pt.ca(t);
    }
    priceScale(t) {
      if (null === this.Pt.Do(t))
        throw new Error(`Cannot find price scale with id: ${t}`);
      return new Vn(this.Ff, t, this.paneIndex());
    }
    setPreserveEmptyPane(t) {
      this.Pt.zo(t);
    }
    preserveEmptyPane() {
      return this.Pt.Oo();
    }
    addCustomSeries(t, i = {}, s = 0) {
      return this.wg.addCustomSeries(t, i, s);
    }
    addSeries(t, i = {}) {
      return this.wg.addSeries(t, i, this.paneIndex());
    }
  }
  const In = {
    color: '#FF0000',
    price: 0,
    lineStyle: 2,
    lineWidth: 1,
    lineVisible: !0,
    axisLabelVisible: !0,
    title: '',
    axisLabelColor: '',
    axisLabelTextColor: '',
  };
  class An {
    constructor(t) {
      this.ir = t;
    }
    applyOptions(t) {
      this.ir.hr(t);
    }
    options() {
      return this.ir.N();
    }
    gg() {
      return this.ir;
    }
  }
  class zn {
    constructor(t, i, s, n, e, r) {
      (this.Mg = new o()),
        (this.Jn = t),
        (this.bg = i),
        (this.xg = s),
        (this.o_ = e),
        (this.wg = n),
        (this.Sg = r);
    }
    m() {
      this.Mg.m();
    }
    priceFormatter() {
      return this.Jn.ra();
    }
    priceToCoordinate(t) {
      const i = this.Jn.zt();
      return null === i ? null : this.Jn.Wt().Nt(t, i.Ft);
    }
    coordinateToPrice(t) {
      const i = this.Jn.zt();
      return null === i ? null : this.Jn.Wt().Ts(t, i.Ft);
    }
    barsInLogicalRange(t) {
      if (null === t) return null;
      const i = new yi(new Si(t.from, t.to)).y_(),
        s = this.Jn.Xs();
      if (s.Ki()) return null;
      const n = s.Wr(i.Uh(), 1),
        e = s.Wr(i.bi(), -1),
        r = a(s.Or()),
        h = a(s.Ks());
      if (null !== n && null !== e && n.Re > e.Re)
        return { barsBefore: t.from - r, barsAfter: h - t.to };
      const l = {
        barsBefore: null === n || n.Re === r ? t.from - r : n.Re - r,
        barsAfter: null === e || e.Re === h ? h - t.to : h - e.Re,
      };
      return null !== n && null !== e && ((l.from = n.Pw), (l.to = e.Pw)), l;
    }
    setData(t) {
      this.o_, this.Jn.Rr(), this.bg.Cg(this.Jn, t), this.Pg('full');
    }
    update(t, i = !1) {
      this.Jn.Rr(), this.bg.yg(this.Jn, t, i), this.Pg('update');
    }
    dataByIndex(t, i) {
      const s = this.Jn.Xs().Wr(t, i);
      if (null === s) return null;
      return Cn(this.seriesType())(s);
    }
    data() {
      const t = Cn(this.seriesType());
      return this.Jn.Xs()
        .Hr()
        .map((i) => t(i));
    }
    subscribeDataChanged(t) {
      this.Mg.i(t);
    }
    unsubscribeDataChanged(t) {
      this.Mg._(t);
    }
    applyOptions(t) {
      this.Jn.hr(t);
    }
    options() {
      return p(this.Jn.N());
    }
    priceScale() {
      return this.xg.priceScale(this.Jn.Wt().wa(), this.getPane().paneIndex());
    }
    createPriceLine(t) {
      const i = _(p(In), t),
        s = this.Jn.Lh(i);
      return new An(s);
    }
    removePriceLine(t) {
      this.Jn.Nh(t.gg());
    }
    priceLines() {
      return this.Jn.Wh().map((t) => new An(t));
    }
    seriesType() {
      return this.Jn.Rr();
    }
    attachPrimitive(t) {
      this.Jn.ua(t),
        t.attached &&
          t.attached({
            chart: this.wg,
            series: this,
            requestUpdate: () => this.Jn.Qt().Bh(),
            horzScaleBehavior: this.o_,
          });
    }
    detachPrimitive(t) {
      this.Jn.ca(t), t.detached && t.detached(), this.Jn.Qt().Bh();
    }
    getPane() {
      const t = this.Jn,
        i = a(this.Jn.Qt().Hn(t));
      return this.Sg(i);
    }
    moveToPane(t) {
      this.Jn.Qt().Lc(this.Jn, t);
    }
    seriesOrder() {
      const t = this.Jn.Qt().Hn(this.Jn);
      return null === t ? -1 : t.Lo().indexOf(this.Jn);
    }
    setSeriesOrder(t) {
      const i = this.Jn.Qt().Hn(this.Jn);
      null !== i && i.Qo(this.Jn, t);
    }
    Pg(t) {
      this.Mg.v() && this.Mg.p(t);
    }
  }
  class On {
    constructor(t, i, s) {
      (this.kg = new o()),
        (this.z_ = new o()),
        (this.wm = new o()),
        (this.ts = t),
        (this.uh = t.It()),
        (this.Xm = i),
        this.uh.Du().i(this.Tg.bind(this)),
        this.uh.Eu().i(this.Rg.bind(this)),
        this.Xm.Pm().i(this.Dg.bind(this)),
        (this.o_ = s);
    }
    m() {
      this.uh.Du().u(this),
        this.uh.Eu().u(this),
        this.Xm.Pm().u(this),
        this.kg.m(),
        this.z_.m(),
        this.wm.m();
    }
    scrollPosition() {
      return this.uh.wu();
    }
    scrollToPosition(t, i) {
      i ? this.uh.ku(t, 1e3) : this.ts.fn(t);
    }
    scrollToRealTime() {
      this.uh.yu();
    }
    getVisibleRange() {
      const t = this.uh.su();
      return null === t
        ? null
        : { from: t.from.originalTime, to: t.to.originalTime };
    }
    setVisibleRange(t) {
      const i = {
          from: this.o_.convertHorzItemToInternal(t.from),
          to: this.o_.convertHorzItemToInternal(t.to),
        },
        s = this.uh.hu(i);
      this.ts.zc(s);
    }
    getVisibleLogicalRange() {
      const t = this.uh.iu();
      return null === t ? null : { from: t.Uh(), to: t.bi() };
    }
    setVisibleLogicalRange(t) {
      r(t.from <= t.to, 'The from index cannot be after the to index.'),
        this.ts.zc(t);
    }
    resetTimeScale() {
      this.ts.cn();
    }
    fitContent() {
      this.ts.Iu();
    }
    logicalToCoordinate(t) {
      const i = this.ts.It();
      return i.Ki() ? null : i.jt(t);
    }
    coordinateToLogical(t) {
      return this.uh.Ki() ? null : this.uh.uu(t);
    }
    timeToIndex(t, i) {
      const s = this.o_.convertHorzItemToInternal(t);
      return this.uh.J_(s, i);
    }
    timeToCoordinate(t) {
      const i = this.timeToIndex(t, !1);
      return null === i ? null : this.uh.jt(i);
    }
    coordinateToTime(t) {
      const i = this.ts.It(),
        s = i.uu(t),
        n = i.ss(s);
      return null === n ? null : n.originalTime;
    }
    width() {
      return this.Xm.Zf().width;
    }
    height() {
      return this.Xm.Zf().height;
    }
    subscribeVisibleTimeRangeChange(t) {
      this.kg.i(t);
    }
    unsubscribeVisibleTimeRangeChange(t) {
      this.kg._(t);
    }
    subscribeVisibleLogicalRangeChange(t) {
      this.z_.i(t);
    }
    unsubscribeVisibleLogicalRangeChange(t) {
      this.z_._(t);
    }
    subscribeSizeChange(t) {
      this.wm.i(t);
    }
    unsubscribeSizeChange(t) {
      this.wm._(t);
    }
    applyOptions(t) {
      this.uh.hr(t);
    }
    options() {
      return { ...p(this.uh.N()), barSpacing: this.uh.vu() };
    }
    Tg() {
      this.kg.v() && this.kg.p(this.getVisibleRange());
    }
    Rg() {
      this.z_.v() && this.z_.p(this.getVisibleLogicalRange());
    }
    Dg(t) {
      this.wm.p(t.width, t.height);
    }
  }
  function Ln(t) {
    if (void 0 === t || 'custom' === t.type) return;
    const i = t;
    void 0 !== i.minMove &&
      void 0 === i.precision &&
      (i.precision = (function (t) {
        if (t >= 1) return 0;
        let i = 0;
        for (; i < 8; i++) {
          const s = Math.round(t);
          if (Math.abs(s - t) < 1e-8) return i;
          t *= 10;
        }
        return i;
      })(i.minMove));
  }
  function Nn(t) {
    return (
      (function (t) {
        if (f(t.handleScale)) {
          const i = t.handleScale;
          t.handleScale = {
            axisDoubleClickReset: { time: i, price: i },
            axisPressedMouseMove: { time: i, price: i },
            mouseWheel: i,
            pinch: i,
          };
        } else if (void 0 !== t.handleScale) {
          const { axisPressedMouseMove: i, axisDoubleClickReset: s } =
            t.handleScale;
          f(i) && (t.handleScale.axisPressedMouseMove = { time: i, price: i }),
            f(s) &&
              (t.handleScale.axisDoubleClickReset = { time: s, price: s });
        }
        const i = t.handleScroll;
        f(i) &&
          (t.handleScroll = {
            horzTouchDrag: i,
            vertTouchDrag: i,
            mouseWheel: i,
            pressedMouseMove: i,
          });
      })(t),
      t
    );
  }
  class Wn {
    constructor(t, i, s) {
      (this.Eg = new Map()),
        (this.Vg = new Map()),
        (this.Bg = new o()),
        (this.Ig = new o()),
        (this.Ag = new o()),
        (this.$u = new WeakMap()),
        (this.zg = new hn(i));
      const n = void 0 === s ? p(En()) : _(p(En()), Nn(s));
      (this.Og = i),
        (this.Ff = new Hs(t, n, i)),
        this.Ff.Kv().i((t) => {
          this.Bg.v() && this.Bg.p(this.Lg(t()));
        }, this),
        this.Ff.Xv().i((t) => {
          this.Ig.v() && this.Ig.p(this.Lg(t()));
        }, this),
        this.Ff.uc().i((t) => {
          this.Ag.v() && this.Ag.p(this.Lg(t()));
        }, this);
      const e = this.Ff.Qt();
      this.Ng = new On(e, this.Ff.tw(), this.Og);
    }
    remove() {
      this.Ff.Kv().u(this),
        this.Ff.Xv().u(this),
        this.Ff.uc().u(this),
        this.Ng.m(),
        this.Ff.m(),
        this.Eg.clear(),
        this.Vg.clear(),
        this.Bg.m(),
        this.Ig.m(),
        this.Ag.m(),
        this.zg.m();
    }
    resize(t, i, s) {
      this.autoSizeActive() || this.Ff.Gm(t, i, s);
    }
    addCustomSeries(t, i = {}, s = 0) {
      const n = ((t) => ({
        type: 'Custom',
        isBuiltIn: !1,
        defaultOptions: { ...pn, ...t.defaultOptions() },
        Wg: vn,
        Fg: t,
      }))(l(t));
      return this.Hg(n, i, s);
    }
    addSeries(t, i = {}, s = 0) {
      return this.Hg(t, i, s);
    }
    removeSeries(t) {
      const i = h(this.Eg.get(t)),
        s = this.zg.Ic(i);
      this.Ff.Qt().Ic(i), this.Ug(s), this.Eg.delete(t), this.Vg.delete(i);
    }
    Cg(t, i) {
      this.Ug(this.zg.Ww(t, i));
    }
    yg(t, i, s) {
      this.Ug(this.zg.qw(t, i, s));
    }
    subscribeClick(t) {
      this.Bg.i(t);
    }
    unsubscribeClick(t) {
      this.Bg._(t);
    }
    subscribeCrosshairMove(t) {
      this.Ag.i(t);
    }
    unsubscribeCrosshairMove(t) {
      this.Ag._(t);
    }
    subscribeDblClick(t) {
      this.Ig.i(t);
    }
    unsubscribeDblClick(t) {
      this.Ig._(t);
    }
    priceScale(t, i = 0) {
      return new Vn(this.Ff, t, i);
    }
    timeScale() {
      return this.Ng;
    }
    applyOptions(t) {
      this.Ff.hr(Nn(t));
    }
    options() {
      return this.Ff.N();
    }
    takeScreenshot() {
      return this.Ff.hw();
    }
    addPane(t = !1) {
      const i = this.Ff.Qt().Uc();
      return i.zo(t), this.$g(i);
    }
    removePane(t) {
      this.Ff.Qt().dc(t);
    }
    swapPanes(t, i) {
      this.Ff.Qt().vc(t, i);
    }
    autoSizeActive() {
      return this.Ff.uw();
    }
    chartElement() {
      return this.Ff.tp();
    }
    panes() {
      return this.Ff.Qt()
        .$s()
        .map((t) => this.$g(t));
    }
    paneSize(t = 0) {
      const i = this.Ff.fw(t);
      return { height: i.height, width: i.width };
    }
    setCrosshairPosition(t, i, s) {
      const n = this.Eg.get(s);
      if (void 0 === n) return;
      const e = this.Ff.Qt().Hn(n);
      null !== e && this.Ff.Qt().Tc(t, i, e);
    }
    clearCrosshairPosition() {
      this.Ff.Qt().Rc(!0);
    }
    horzBehaviour() {
      return this.Og;
    }
    Hg(i, s = {}, n = 0) {
      r(void 0 !== i.Wg),
        Ln(s.priceFormat),
        'Candlestick' === i.type &&
          (function (t) {
            void 0 !== t.borderColor &&
              ((t.borderUpColor = t.borderColor),
              (t.borderDownColor = t.borderColor)),
              void 0 !== t.wickColor &&
                ((t.wickUpColor = t.wickColor),
                (t.wickDownColor = t.wickColor));
          })(s);
      const e = _(p(t), p(i.defaultOptions), s),
        h = i.Wg,
        a = new Ut(this.Ff.Qt(), i.type, e, h, i.Fg);
      this.Ff.Qt().Vc(a, n);
      const l = new zn(a, this, this, this, this.Og, (t) => this.$g(t));
      return this.Eg.set(l, a), this.Vg.set(a, l), l;
    }
    Ug(t) {
      const i = this.Ff.Qt();
      i.Dc(t.It.ou, t.It.Gw, t.It.Jw),
        t.Lo.forEach((t, i) => i.ht(t.se, t.Zw)),
        i.It().Y_(),
        i.pu();
    }
    jg(t) {
      return h(this.Vg.get(t));
    }
    Lg(t) {
      const i = new Map();
      t.Rw.forEach((t, s) => {
        const n = s.Rr(),
          e = Cn(n)(t);
        if ('Custom' !== n) r(js(e));
        else {
          const t = s.pa();
          r(!t || !1 === t(e));
        }
        i.set(this.jg(s), e);
      });
      const s = void 0 !== t.Tw && this.Vg.has(t.Tw) ? this.jg(t.Tw) : void 0;
      return {
        time: t.Pw,
        logical: t.Re,
        point: t.yw,
        paneIndex: t.kw,
        hoveredSeries: s,
        hoveredObjectId: t.Dw,
        seriesData: i,
        sourceEvent: t.Ew,
      };
    }
    $g(t) {
      let i = this.$u.get(t);
      return (
        i ||
          ((i = new Bn(this.Ff, (t) => this.jg(t), t, this)),
          this.$u.set(t, i)),
        i
      );
    }
  }
  function Fn(t) {
    if (d(t)) {
      const i = document.getElementById(t);
      return r(null !== i, `Cannot find element in DOM with id=${t}`), i;
    }
    return t;
  }
  function Hn(t, i, s) {
    const n = Fn(t),
      e = new Wn(n, i, s);
    return i.setOptions(e.options()), e;
  }
  class Un extends un {
    constructor(t, i) {
      super(t, i, !0);
    }
    ug(t, i, s) {
      i._u(this.sg, m(this.ng)), t.$l(this.sg, s, m(this.ng));
    }
    qg(t, i) {
      return { wt: t, gt: i, _t: NaN, ut: NaN };
    }
    og() {
      const t = this.Jn.Rh();
      this.sg = this.Jn.Xs()
        .Hr()
        .map((i) => {
          const s = i.Ft[3];
          return this.Yg(i.Re, s, t);
        });
    }
  }
  function $n(t, i, s, n, e, r, h) {
    if (0 === i.length || n.from >= i.length || n.to <= 0) return;
    const { context: a, horizontalPixelRatio: l, verticalPixelRatio: o } = t,
      _ = i[n.from];
    let u = r(t, _),
      c = _;
    if (n.to - n.from < 2) {
      const i = e / 2;
      a.beginPath();
      const s = { _t: _._t - i, ut: _.ut },
        n = { _t: _._t + i, ut: _.ut };
      a.moveTo(s._t * l, s.ut * o), a.lineTo(n._t * l, n.ut * o), h(t, u, s, n);
    } else {
      const e = (i, s) => {
        h(t, u, c, s), a.beginPath(), (u = i), (c = s);
      };
      let d = c;
      a.beginPath(), a.moveTo(_._t * l, _.ut * o);
      for (let h = n.from + 1; h < n.to; ++h) {
        d = i[h];
        const n = r(t, d);
        switch (s) {
          case 0:
            a.lineTo(d._t * l, d.ut * o);
            break;
          case 1:
            a.lineTo(d._t * l, i[h - 1].ut * o),
              n !== u && (e(n, d), a.lineTo(d._t * l, i[h - 1].ut * o)),
              a.lineTo(d._t * l, d.ut * o);
            break;
          case 2: {
            const [t, s] = Kn(i, h - 1, h);
            a.bezierCurveTo(
              t._t * l,
              t.ut * o,
              s._t * l,
              s.ut * o,
              d._t * l,
              d.ut * o,
            );
            break;
          }
        }
        1 !== s && n !== u && (e(n, d), a.moveTo(d._t * l, d.ut * o));
      }
      (c !== d || (c === d && 1 === s)) && h(t, u, c, d);
    }
  }
  const jn = 6;
  function qn(t, i) {
    return { _t: t._t - i._t, ut: t.ut - i.ut };
  }
  function Yn(t, i) {
    return { _t: t._t / i, ut: t.ut / i };
  }
  function Kn(t, i, s) {
    const n = Math.max(0, i - 1),
      e = Math.min(t.length - 1, s + 1);
    var r, h;
    return [
      ((r = t[i]),
      (h = Yn(qn(t[s], t[n]), jn)),
      { _t: r._t + h._t, ut: r.ut + h.ut }),
      qn(t[s], Yn(qn(t[e], t[i]), jn)),
    ];
  }
  function Xn(t, i) {
    const s = t.context;
    (s.strokeStyle = i), s.stroke();
  }
  class Zn extends P {
    constructor() {
      super(...arguments), (this.rt = null);
    }
    ht(t) {
      this.rt = t;
    }
    et(t) {
      if (null === this.rt) return;
      const { ot: i, lt: s, Kg: e, Xg: r, ct: h, Xt: a, Zg: l } = this.rt;
      if (null === s) return;
      const o = t.context;
      (o.lineCap = 'butt'),
        (o.lineWidth = h * t.verticalPixelRatio),
        n(o, a),
        (o.lineJoin = 'round');
      const _ = this.Gg.bind(this);
      void 0 !== r && $n(t, i, r, s, e, _, Xn),
        l &&
          (function (t, i, s, n, e) {
            if (n.to - n.from <= 0) return;
            const {
              horizontalPixelRatio: r,
              verticalPixelRatio: h,
              context: a,
            } = t;
            let l = null;
            const o = (Math.max(1, Math.floor(r)) % 2) / 2,
              _ = s * h + o;
            for (let s = n.to - 1; s >= n.from; --s) {
              const n = i[s];
              if (n) {
                const i = e(t, n);
                i !== l &&
                  (a.beginPath(),
                  null !== l && a.fill(),
                  (a.fillStyle = i),
                  (l = i));
                const s = Math.round(n._t * r) + o,
                  u = n.ut * h;
                a.moveTo(s, u), a.arc(s, u, _, 0, 2 * Math.PI);
              }
            }
            a.fill();
          })(t, i, l, s, _);
    }
  }
  class Gn extends Zn {
    Gg(t, i) {
      return i.vt;
    }
  }
  class Jn extends Un {
    constructor() {
      super(...arguments), (this.hg = new Gn());
    }
    Yg(t, i, s) {
      return { ...this.qg(t, i), ...s.Dr(t) };
    }
    cg() {
      const t = this.Jn.N(),
        i = {
          ot: this.sg,
          Xt: t.lineStyle,
          Xg: t.lineVisible ? t.lineType : void 0,
          ct: t.lineWidth,
          Zg: t.pointMarkersVisible
            ? t.pointMarkersRadius || t.lineWidth / 2 + 2
            : void 0,
          lt: this.ng,
          Kg: this.Qn.It().vu(),
        };
      this.hg.ht(i);
    }
  }
  const Qn = {
    type: 'Line',
    isBuiltIn: !0,
    defaultOptions: {
      color: '#2196f3',
      lineStyle: 0,
      lineWidth: 3,
      lineType: 0,
      lineVisible: !0,
      crosshairMarkerVisible: !0,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '',
      crosshairMarkerBorderWidth: 2,
      crosshairMarkerBackgroundColor: '',
      lastPriceAnimation: 0,
      pointMarkersVisible: !1,
    },
    Wg: (t, i) => new Jn(t, i),
  };
  function te(t, i) {
    return t.weight > i.weight ? t : i;
  }
  class ie {
    constructor() {
      (this.Jg = new o()),
        (this.Qg = (function (t) {
          let i = !1;
          return function (...s) {
            i ||
              ((i = !0),
              queueMicrotask(() => {
                t(...s), (i = !1);
              }));
          };
        })(() => this.Jg.p(this.tM))),
        (this.tM = 0);
    }
    iM() {
      return this.Jg;
    }
    m() {
      this.Jg.m();
    }
    options() {
      return this.Ps;
    }
    setOptions(t) {
      this.Ps = t;
    }
    preprocessData(t) {}
    updateFormatter(t) {
      this.Ps && (this.Ps.localization = t);
    }
    createConverterToInternalObj(t) {
      return this.Qg(), (t) => (t > this.tM && (this.tM = t), t);
    }
    key(t) {
      return t;
    }
    cacheKey(t) {
      return t;
    }
    convertHorzItemToInternal(t) {
      return t;
    }
    formatHorzItem(t) {
      return this.sM(t);
    }
    formatTickmark(t) {
      return this.sM(t.time);
    }
    maxTickMarkWeight(t) {
      return t.reduce(te, t[0]).weight;
    }
    fillWeightsForPoints(t, i) {
      for (let n = i; n < t.length; ++n)
        t[n].timeWeight =
          (s = t[n].time) % 120 == 0
            ? 10
            : s % 60 == 0
            ? 9
            : s % 36 == 0
            ? 8
            : s % 12 == 0
            ? 7
            : s % 6 == 0
            ? 6
            : s % 3 == 0
            ? 5
            : s % 1 == 0
            ? 4
            : 0;
      var s;
      (this.tM = t[t.length - 1].time), this.Qg();
    }
    sM(t) {
      if (this.Ps.localization?.timeFormatter)
        return this.Ps.localization.timeFormatter(t);
      if (t < 12) return `${t}M`;
      const i = Math.floor(t / 12),
        s = t % 12;
      return 0 === s ? `${i}Y` : `${i}Y${s}M`;
    }
  }
  const se = {
      yieldCurve: {
        baseResolution: 1,
        minimumTimeRange: 120,
        startTimeRange: 0,
      },
      timeScale: { ignoreWhitespaceIndices: !0 },
      leftPriceScale: { visible: !0 },
      rightPriceScale: { visible: !1 },
      localization: { priceFormatter: (t) => t.toFixed(3) + '%' },
    },
    ne = { lastValueVisible: !1, priceLineVisible: !1 };
  class ee extends Wn {
    constructor(t, i) {
      const s = _(se, i || {}),
        n = new ie();
      super(t, n, s),
        n.setOptions(this.options()),
        this._initWhitespaceSeries();
    }
    addSeries(t, i = {}, s = 0) {
      if (t.isBuiltIn && !1 === ['Area', 'Line'].includes(t.type))
        throw new Error('Yield curve only support Area and Line series');
      const n = { ...ne, ...i };
      return super.addSeries(t, n, s);
    }
    _initWhitespaceSeries() {
      const t = this.horzBehaviour(),
        i = this.addSeries(Qn);
      let s;
      function n(n) {
        const e = (function (t, i) {
            return {
              le: Math.max(0, t.startTimeRange),
              oe: Math.max(0, t.minimumTimeRange, i || 0),
              nM: Math.max(1, t.baseResolution),
            };
          })(t.options().yieldCurve, n),
          r = (({ le: t, oe: i, nM: s }) => `${t}~${i}~${s}`)(e);
        r !== s &&
          ((s = r),
          i.setData(
            (function ({ le: t, oe: i, nM: s }) {
              return Array.from(
                { length: Math.floor((i - t) / s) + 1 },
                (i, n) => ({ time: t + n * s }),
              );
            })(e),
          ));
      }
      n(0), t.iM().i(n);
    }
  }
  function re(t, i) {
    return t.weight > i.weight ? t : i;
  }
  class he {
    options() {
      return this.Ps;
    }
    setOptions(t) {
      this.Ps = t;
    }
    preprocessData(t) {}
    updateFormatter(t) {
      this.Ps && (this.Ps.localization = t);
    }
    createConverterToInternalObj(t) {
      return (t) => t;
    }
    key(t) {
      return t;
    }
    cacheKey(t) {
      return t;
    }
    convertHorzItemToInternal(t) {
      return t;
    }
    formatHorzItem(t) {
      return t.toFixed(this.Cn());
    }
    formatTickmark(t, i) {
      return t.time.toFixed(this.Cn());
    }
    maxTickMarkWeight(t) {
      return t.reduce(re, t[0]).weight;
    }
    fillWeightsForPoints(t, i) {
      for (let n = i; n < t.length; ++n)
        t[n].timeWeight =
          (s = t[n].time) === 100 * Math.ceil(s / 100)
            ? 8
            : s === 50 * Math.ceil(s / 50)
            ? 7
            : s === 25 * Math.ceil(s / 25)
            ? 6
            : s === 10 * Math.ceil(s / 10)
            ? 5
            : s === 5 * Math.ceil(s / 5)
            ? 4
            : s === Math.ceil(s)
            ? 3
            : 2 * s === Math.ceil(2 * s)
            ? 1
            : 0;
      var s;
    }
    Cn() {
      return this.Ps.localization.precision;
    }
  }
  function ae(t, i, s, n, e) {
    const { context: r, horizontalPixelRatio: h, verticalPixelRatio: a } = i;
    r.lineTo(e._t * h, t * a),
      r.lineTo(n._t * h, t * a),
      r.closePath(),
      (r.fillStyle = s),
      r.fill();
  }
  class le extends P {
    constructor() {
      super(...arguments), (this.rt = null);
    }
    ht(t) {
      this.rt = t;
    }
    et(t) {
      if (null === this.rt) return;
      const { ot: i, lt: s, Kg: e, ct: r, Xt: h, Xg: a } = this.rt,
        l = this.rt.eM ?? (this.rt.rM ? 0 : t.mediaSize.height);
      if (null === s) return;
      const o = t.context;
      (o.lineCap = 'butt'),
        (o.lineJoin = 'round'),
        (o.lineWidth = r),
        n(o, h),
        (o.lineWidth = 1),
        $n(t, i, a, s, e, this.hM.bind(this), ae.bind(null, l));
    }
  }
  class oe {
    aM(t, i) {
      const s = this.lM,
        { oM: n, _M: e, uM: r, cM: h, eM: a, dM: l, fM: o } = i;
      if (
        void 0 === this.pM ||
        void 0 === s ||
        s.oM !== n ||
        s._M !== e ||
        s.uM !== r ||
        s.cM !== h ||
        s.eM !== a ||
        s.dM !== l ||
        s.fM !== o
      ) {
        const { verticalPixelRatio: s } = t,
          _ = a || l > 0 ? s : 1,
          u = l * _,
          c = o === t.bitmapSize.height ? o : o * _,
          d = (a ?? 0) * _,
          f = t.context.createLinearGradient(0, u, 0, c);
        if ((f.addColorStop(0, n), null != a)) {
          const t = Yt((d - u) / (c - u), 0, 1);
          f.addColorStop(t, e), f.addColorStop(t, r);
        }
        f.addColorStop(1, h), (this.pM = f), (this.lM = i);
      }
      return this.pM;
    }
  }
  class _e extends le {
    constructor() {
      super(...arguments), (this.vM = new oe());
    }
    hM(t, i) {
      const s = this.rt;
      return this.vM.aM(t, {
        oM: i.br,
        _M: i.Sr,
        uM: i.Cr,
        cM: i.Pr,
        eM: s.eM,
        dM: s.dM ?? 0,
        fM: s.fM ?? t.bitmapSize.height,
      });
    }
  }
  class ue extends Zn {
    constructor() {
      super(...arguments), (this.mM = new oe());
    }
    Gg(t, i) {
      const s = this.rt;
      return this.mM.aM(t, {
        oM: i.gr,
        _M: i.gr,
        uM: i.Mr,
        cM: i.Mr,
        eM: s.eM,
        dM: s.dM ?? 0,
        fM: s.fM ?? t.bitmapSize.height,
      });
    }
  }
  class ce extends Un {
    constructor(t, i) {
      super(t, i),
        (this.hg = new C()),
        (this.wM = new _e()),
        (this.gM = new ue()),
        this.hg.st([this.wM, this.gM]);
    }
    Yg(t, i, s) {
      return { ...this.qg(t, i), ...s.Dr(t) };
    }
    cg() {
      const t = this.Jn.zt();
      if (null === t) return;
      const i = this.Jn.N(),
        s = this.Jn.Wt().Nt(i.baseValue.price, t.Ft),
        n = this.Qn.It().vu();
      if (null === this.ng || 0 === this.sg.length) return;
      let e, r;
      if (i.relativeGradient) {
        (e = this.sg[this.ng.from].ut), (r = this.sg[this.ng.from].ut);
        for (let t = this.ng.from; t < this.ng.to; t++) {
          const i = this.sg[t];
          i.ut < e && (e = i.ut), i.ut > r && (r = i.ut);
        }
      }
      this.wM.ht({
        ot: this.sg,
        ct: i.lineWidth,
        Xt: i.lineStyle,
        Xg: i.lineType,
        eM: s,
        dM: e,
        fM: r,
        rM: !1,
        lt: this.ng,
        Kg: n,
      }),
        this.gM.ht({
          ot: this.sg,
          ct: i.lineWidth,
          Xt: i.lineStyle,
          Xg: i.lineVisible ? i.lineType : void 0,
          Zg: i.pointMarkersVisible
            ? i.pointMarkersRadius || i.lineWidth / 2 + 2
            : void 0,
          eM: s,
          dM: e,
          fM: r,
          lt: this.ng,
          Kg: n,
        });
    }
  }
  const de = {
    type: 'Baseline',
    isBuiltIn: !0,
    defaultOptions: {
      baseValue: { type: 'price', price: 0 },
      relativeGradient: !1,
      topFillColor1: 'rgba(38, 166, 154, 0.28)',
      topFillColor2: 'rgba(38, 166, 154, 0.05)',
      topLineColor: 'rgba(38, 166, 154, 1)',
      bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
      bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
      bottomLineColor: 'rgba(239, 83, 80, 1)',
      lineWidth: 3,
      lineStyle: 0,
      lineType: 0,
      lineVisible: !0,
      crosshairMarkerVisible: !0,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '',
      crosshairMarkerBorderWidth: 2,
      crosshairMarkerBackgroundColor: '',
      lastPriceAnimation: 0,
      pointMarkersVisible: !1,
    },
    Wg: (t, i) => new ce(t, i),
  };
  class fe extends le {
    constructor() {
      super(...arguments), (this.vM = new oe());
    }
    hM(t, i) {
      return this.vM.aM(t, {
        oM: i.mr,
        _M: '',
        uM: '',
        cM: i.wr,
        dM: this.rt?.dM ?? 0,
        fM: t.bitmapSize.height,
      });
    }
  }
  class pe extends Un {
    constructor(t, i) {
      super(t, i),
        (this.hg = new C()),
        (this.MM = new fe()),
        (this.bM = new Gn()),
        this.hg.st([this.MM, this.bM]);
    }
    Yg(t, i, s) {
      return { ...this.qg(t, i), ...s.Dr(t) };
    }
    cg() {
      const t = this.Jn.N();
      if (null === this.ng || 0 === this.sg.length) return;
      let i;
      if (t.relativeGradient) {
        i = this.sg[this.ng.from].ut;
        for (let t = this.ng.from; t < this.ng.to; t++) {
          const s = this.sg[t];
          s.ut < i && (i = s.ut);
        }
      }
      this.MM.ht({
        Xg: t.lineType,
        ot: this.sg,
        Xt: t.lineStyle,
        ct: t.lineWidth,
        eM: null,
        dM: i,
        rM: t.invertFilledArea,
        lt: this.ng,
        Kg: this.Qn.It().vu(),
      }),
        this.bM.ht({
          Xg: t.lineVisible ? t.lineType : void 0,
          ot: this.sg,
          Xt: t.lineStyle,
          ct: t.lineWidth,
          lt: this.ng,
          Kg: this.Qn.It().vu(),
          Zg: t.pointMarkersVisible
            ? t.pointMarkersRadius || t.lineWidth / 2 + 2
            : void 0,
        });
    }
  }
  const ve = {
    type: 'Area',
    isBuiltIn: !0,
    defaultOptions: {
      topColor: 'rgba( 46, 220, 135, 0.4)',
      bottomColor: 'rgba( 40, 221, 100, 0)',
      invertFilledArea: !1,
      relativeGradient: !1,
      lineColor: '#33D778',
      lineStyle: 0,
      lineWidth: 3,
      lineType: 0,
      lineVisible: !0,
      crosshairMarkerVisible: !0,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '',
      crosshairMarkerBorderWidth: 2,
      crosshairMarkerBackgroundColor: '',
      lastPriceAnimation: 0,
      pointMarkersVisible: !1,
    },
    Wg: (t, i) => new pe(t, i),
  };
  class me extends P {
    constructor() {
      super(...arguments), (this.qt = null), (this.xM = 0), (this.SM = 0);
    }
    ht(t) {
      this.qt = t;
    }
    et({ context: t, horizontalPixelRatio: i, verticalPixelRatio: s }) {
      if (null === this.qt || 0 === this.qt.Xs.length || null === this.qt.lt)
        return;
      if (((this.xM = this.CM(i)), this.xM >= 2)) {
        Math.max(1, Math.floor(i)) % 2 != this.xM % 2 && this.xM--;
      }
      this.SM = this.qt.PM ? Math.min(this.xM, Math.floor(i)) : this.xM;
      let n = null;
      const e = this.SM <= this.xM && this.qt.vu >= Math.floor(1.5 * i);
      for (let r = this.qt.lt.from; r < this.qt.lt.to; ++r) {
        const h = this.qt.Xs[r];
        n !== h.cr && ((t.fillStyle = h.cr), (n = h.cr));
        const a = Math.floor(0.5 * this.SM),
          l = Math.round(h._t * i),
          o = l - a,
          _ = this.SM,
          u = o + _ - 1,
          c = Math.min(h.Kl, h.Xl),
          d = Math.max(h.Kl, h.Xl),
          f = Math.round(c * s) - a,
          p = Math.round(d * s) + a,
          v = Math.max(p - f, this.SM);
        t.fillRect(o, f, _, v);
        const m = Math.ceil(1.5 * this.xM);
        if (e) {
          if (this.qt.yM) {
            const i = l - m;
            let n = Math.max(f, Math.round(h.Yl * s) - a),
              e = n + _ - 1;
            e > f + v - 1 && ((e = f + v - 1), (n = e - _ + 1)),
              t.fillRect(i, n, o - i, e - n + 1);
          }
          const i = l + m;
          let n = Math.max(f, Math.round(h.Zl * s) - a),
            e = n + _ - 1;
          e > f + v - 1 && ((e = f + v - 1), (n = e - _ + 1)),
            t.fillRect(u + 1, n, i - u, e - n + 1);
        }
      }
    }
    CM(t) {
      const i = Math.floor(t);
      return Math.max(
        i,
        Math.floor(
          (function (t, i) {
            return Math.floor(0.3 * t * i);
          })(a(this.qt).vu, t),
        ),
      );
    }
  }
  class we extends un {
    constructor(t, i) {
      super(t, i, !1);
    }
    ug(t, i, s) {
      i._u(this.sg, m(this.ng)), t.ql(this.sg, s, m(this.ng));
    }
    kM(t, i, s) {
      return {
        wt: t,
        jh: i.Ft[0],
        qh: i.Ft[1],
        Yh: i.Ft[2],
        Kh: i.Ft[3],
        _t: NaN,
        Yl: NaN,
        Kl: NaN,
        Xl: NaN,
        Zl: NaN,
      };
    }
    og() {
      const t = this.Jn.Rh();
      this.sg = this.Jn.Xs()
        .Hr()
        .map((i) => this.Yg(i.Re, i, t));
    }
  }
  class ge extends we {
    constructor() {
      super(...arguments), (this.hg = new me());
    }
    Yg(t, i, s) {
      return { ...this.kM(t, i, s), ...s.Dr(t) };
    }
    cg() {
      const t = this.Jn.N();
      this.hg.ht({
        Xs: this.sg,
        vu: this.Qn.It().vu(),
        yM: t.openVisible,
        PM: t.thinBars,
        lt: this.ng,
      });
    }
  }
  const Me = {
    type: 'Bar',
    isBuiltIn: !0,
    defaultOptions: {
      upColor: '#26a69a',
      downColor: '#ef5350',
      openVisible: !0,
      thinBars: !0,
    },
    Wg: (t, i) => new ge(t, i),
  };
  class be extends P {
    constructor() {
      super(...arguments), (this.qt = null), (this.xM = 0);
    }
    ht(t) {
      this.qt = t;
    }
    et(t) {
      if (null === this.qt || 0 === this.qt.Xs.length || null === this.qt.lt)
        return;
      const { horizontalPixelRatio: i } = t;
      if (
        ((this.xM = (function (t, i) {
          if (t >= 2.5 && t <= 4) return Math.floor(3 * i);
          const s = 1 - (0.2 * Math.atan(Math.max(4, t) - 4)) / (0.5 * Math.PI),
            n = Math.floor(t * s * i),
            e = Math.floor(t * i),
            r = Math.min(n, e);
          return Math.max(Math.floor(i), r);
        })(this.qt.vu, i)),
        this.xM >= 2)
      ) {
        Math.floor(i) % 2 != this.xM % 2 && this.xM--;
      }
      const s = this.qt.Xs;
      this.qt.TM && this.RM(t, s, this.qt.lt),
        this.qt.Mi && this._v(t, s, this.qt.lt);
      const n = this.DM(i);
      (!this.qt.Mi || this.xM > 2 * n) && this.EM(t, s, this.qt.lt);
    }
    RM(t, i, s) {
      if (null === this.qt) return;
      const { context: n, horizontalPixelRatio: e, verticalPixelRatio: r } = t;
      let h = '',
        a = Math.min(Math.floor(e), Math.floor(this.qt.vu * e));
      a = Math.max(Math.floor(e), Math.min(a, this.xM));
      const l = Math.floor(0.5 * a);
      let o = null;
      for (let t = s.from; t < s.to; t++) {
        const s = i[t];
        s.pr !== h && ((n.fillStyle = s.pr), (h = s.pr));
        const _ = Math.round(Math.min(s.Yl, s.Zl) * r),
          u = Math.round(Math.max(s.Yl, s.Zl) * r),
          c = Math.round(s.Kl * r),
          d = Math.round(s.Xl * r);
        let f = Math.round(e * s._t) - l;
        const p = f + a - 1;
        null !== o && ((f = Math.max(o + 1, f)), (f = Math.min(f, p)));
        const v = p - f + 1;
        n.fillRect(f, c, v, _ - c), n.fillRect(f, u + 1, v, d - u), (o = p);
      }
    }
    DM(t) {
      let i = Math.floor(1 * t);
      this.xM <= 2 * i && (i = Math.floor(0.5 * (this.xM - 1)));
      const s = Math.max(Math.floor(t), i);
      return this.xM <= 2 * s ? Math.max(Math.floor(t), Math.floor(1 * t)) : s;
    }
    _v(t, i, s) {
      if (null === this.qt) return;
      const { context: n, horizontalPixelRatio: e, verticalPixelRatio: r } = t;
      let h = '';
      const a = this.DM(e);
      let l = null;
      for (let t = s.from; t < s.to; t++) {
        const s = i[t];
        s.dr !== h && ((n.fillStyle = s.dr), (h = s.dr));
        let o = Math.round(s._t * e) - Math.floor(0.5 * this.xM);
        const _ = o + this.xM - 1,
          u = Math.round(Math.min(s.Yl, s.Zl) * r),
          c = Math.round(Math.max(s.Yl, s.Zl) * r);
        if (
          (null !== l && ((o = Math.max(l + 1, o)), (o = Math.min(o, _))),
          this.qt.vu * e > 2 * a)
        )
          V(n, o, u, _ - o + 1, c - u + 1, a);
        else {
          const t = _ - o + 1;
          n.fillRect(o, u, t, c - u + 1);
        }
        l = _;
      }
    }
    EM(t, i, s) {
      if (null === this.qt) return;
      const { context: n, horizontalPixelRatio: e, verticalPixelRatio: r } = t;
      let h = '';
      const a = this.DM(e);
      for (let t = s.from; t < s.to; t++) {
        const s = i[t];
        let l = Math.round(Math.min(s.Yl, s.Zl) * r),
          o = Math.round(Math.max(s.Yl, s.Zl) * r),
          _ = Math.round(s._t * e) - Math.floor(0.5 * this.xM),
          u = _ + this.xM - 1;
        if (s.cr !== h) {
          const t = s.cr;
          (n.fillStyle = t), (h = t);
        }
        this.qt.Mi && ((_ += a), (l += a), (u -= a), (o -= a)),
          l > o || n.fillRect(_, l, u - _ + 1, o - l + 1);
      }
    }
  }
  class xe extends we {
    constructor() {
      super(...arguments), (this.hg = new be());
    }
    Yg(t, i, s) {
      return { ...this.kM(t, i, s), ...s.Dr(t) };
    }
    cg() {
      const t = this.Jn.N();
      this.hg.ht({
        Xs: this.sg,
        vu: this.Qn.It().vu(),
        TM: t.wickVisible,
        Mi: t.borderVisible,
        lt: this.ng,
      });
    }
  }
  const Se = {
    type: 'Candlestick',
    isBuiltIn: !0,
    defaultOptions: {
      upColor: '#26a69a',
      downColor: '#ef5350',
      wickVisible: !0,
      borderVisible: !0,
      borderColor: '#378658',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickColor: '#737375',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    },
    Wg: (t, i) => new xe(t, i),
  };
  class Ce extends P {
    constructor() {
      super(...arguments), (this.qt = null), (this.VM = []);
    }
    ht(t) {
      (this.qt = t), (this.VM = []);
    }
    et({ context: t, horizontalPixelRatio: i, verticalPixelRatio: s }) {
      if (null === this.qt || 0 === this.qt.ot.length || null === this.qt.lt)
        return;
      this.VM.length || this.BM(i);
      const n = Math.max(1, Math.floor(s)),
        e = Math.round(this.qt.IM * s) - Math.floor(n / 2),
        r = e + n;
      for (let i = this.qt.lt.from; i < this.qt.lt.to; i++) {
        const h = this.qt.ot[i],
          a = this.VM[i - this.qt.lt.from],
          l = Math.round(h.ut * s);
        let o, _;
        (t.fillStyle = h.cr),
          l <= e
            ? ((o = l), (_ = r))
            : ((o = e), (_ = l - Math.floor(n / 2) + n)),
          t.fillRect(a.Uh, o, a.bi - a.Uh + 1, _ - o);
      }
    }
    BM(t) {
      if (null === this.qt || 0 === this.qt.ot.length || null === this.qt.lt)
        return void (this.VM = []);
      const i = Math.ceil(this.qt.vu * t) <= 1 ? 0 : Math.max(1, Math.floor(t)),
        s = Math.round(this.qt.vu * t) - i;
      this.VM = new Array(this.qt.lt.to - this.qt.lt.from);
      for (let i = this.qt.lt.from; i < this.qt.lt.to; i++) {
        const n = this.qt.ot[i],
          e = Math.round(n._t * t);
        let r, h;
        if (s % 2) {
          const t = (s - 1) / 2;
          (r = e - t), (h = e + t);
        } else {
          const t = s / 2;
          (r = e - t), (h = e + t - 1);
        }
        this.VM[i - this.qt.lt.from] = {
          Uh: r,
          bi: h,
          AM: e,
          ne: n._t * t,
          wt: n.wt,
        };
      }
      for (let t = this.qt.lt.from + 1; t < this.qt.lt.to; t++) {
        const s = this.VM[t - this.qt.lt.from],
          n = this.VM[t - this.qt.lt.from - 1];
        s.wt === n.wt + 1 &&
          s.Uh - n.bi !== i + 1 &&
          (n.AM > n.ne ? (n.bi = s.Uh - i - 1) : (s.Uh = n.bi + i + 1));
      }
      let n = Math.ceil(this.qt.vu * t);
      for (let t = this.qt.lt.from; t < this.qt.lt.to; t++) {
        const i = this.VM[t - this.qt.lt.from];
        i.bi < i.Uh && (i.bi = i.Uh);
        const s = i.bi - i.Uh + 1;
        n = Math.min(s, n);
      }
      if (i > 0 && n < 4)
        for (let t = this.qt.lt.from; t < this.qt.lt.to; t++) {
          const i = this.VM[t - this.qt.lt.from];
          i.bi - i.Uh + 1 > n && (i.AM > i.ne ? (i.bi -= 1) : (i.Uh += 1));
        }
    }
  }
  class Pe extends Un {
    constructor() {
      super(...arguments), (this.hg = new Ce());
    }
    Yg(t, i, s) {
      return { ...this.qg(t, i), ...s.Dr(t) };
    }
    cg() {
      const t = {
        ot: this.sg,
        vu: this.Qn.It().vu(),
        lt: this.ng,
        IM: this.Jn.Wt().Nt(this.Jn.N().base, a(this.Jn.zt()).Ft),
      };
      this.hg.ht(t);
    }
  }
  const ye = {
    type: 'Histogram',
    isBuiltIn: !0,
    defaultOptions: { color: '#26a69a', base: 0 },
    Wg: (t, i) => new Pe(t, i),
  };
  class ke {
    constructor(t, i) {
      (this.Pt = t), (this.zM = i), this.OM();
    }
    detach() {
      this.Pt.detachPrimitive(this.zM);
    }
    getPane() {
      return this.Pt;
    }
    applyOptions(t) {
      this.zM.hr?.(t);
    }
    OM() {
      this.Pt.attachPrimitive(this.zM);
    }
  }
  const Te = {
      visible: !0,
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [],
    },
    Re = {
      color: 'rgba(0, 0, 0, 0.5)',
      fontSize: 48,
      fontFamily: w,
      fontStyle: '',
      text: '',
    };
  class De {
    constructor(t) {
      (this.LM = new Map()), (this.qt = t);
    }
    draw(t) {
      t.useMediaCoordinateSpace((t) => {
        if (!this.qt.visible) return;
        const { context: i, mediaSize: s } = t;
        let n = 0;
        for (const t of this.qt.lines) {
          if (0 === t.text.length) continue;
          i.font = t.k;
          const e = this.NM(i, t.text);
          e > s.width ? (t.Su = s.width / e) : (t.Su = 1),
            (n += t.lineHeight * t.Su);
        }
        let e = 0;
        switch (this.qt.vertAlign) {
          case 'top':
            e = 0;
            break;
          case 'center':
            e = Math.max((s.height - n) / 2, 0);
            break;
          case 'bottom':
            e = Math.max(s.height - n, 0);
        }
        for (const t of this.qt.lines) {
          i.save(), (i.fillStyle = t.color);
          let n = 0;
          switch (this.qt.horzAlign) {
            case 'left':
              (i.textAlign = 'left'), (n = t.lineHeight / 2);
              break;
            case 'center':
              (i.textAlign = 'center'), (n = s.width / 2);
              break;
            case 'right':
              (i.textAlign = 'right'), (n = s.width - 1 - t.lineHeight / 2);
          }
          i.translate(n, e),
            (i.textBaseline = 'top'),
            (i.font = t.k),
            i.scale(t.Su, t.Su),
            i.fillText(t.text, 0, t.WM),
            i.restore(),
            (e += t.lineHeight * t.Su);
        }
      });
    }
    NM(t, i) {
      const s = this.FM(t.font);
      let n = s.get(i);
      return void 0 === n && ((n = t.measureText(i).width), s.set(i, n)), n;
    }
    FM(t) {
      let i = this.LM.get(t);
      return void 0 === i && ((i = new Map()), this.LM.set(t, i)), i;
    }
  }
  class Ee {
    constructor(t) {
      this.Ps = Be(t);
    }
    yt(t) {
      this.Ps = Be(t);
    }
    renderer() {
      return new De(this.Ps);
    }
  }
  function Ve(t) {
    return {
      ...t,
      k: g(t.fontSize, t.fontFamily, t.fontStyle),
      lineHeight: t.lineHeight || 1.2 * t.fontSize,
      WM: 0,
      Su: 0,
    };
  }
  function Be(t) {
    return { ...t, lines: t.lines.map(Ve) };
  }
  function Ie(t) {
    return { ...Re, ...t };
  }
  function Ae(t) {
    return { ...Te, ...t, lines: t.lines?.map(Ie) ?? [] };
  }
  class ze {
    constructor(t) {
      (this.Ps = Ae(t)), (this.HM = [new Ee(this.Ps)]);
    }
    updateAllViews() {
      this.HM.forEach((t) => t.yt(this.Ps));
    }
    paneViews() {
      return this.HM;
    }
    attached({ requestUpdate: t }) {
      this.UM = t;
    }
    detached() {
      this.UM = void 0;
    }
    hr(t) {
      (this.Ps = Ae({ ...this.Ps, ...t })), this.UM && this.UM();
    }
  }
  const Oe = { alpha: 1, padding: 0 };
  class Le {
    constructor(t) {
      this.qt = t;
    }
    draw(t) {
      t.useMediaCoordinateSpace((t) => {
        const i = t.context,
          s = this.$M(this.qt, t.mediaSize);
        s &&
          this.qt.jM &&
          ((i.globalAlpha = this.qt.alpha ?? 1),
          i.drawImage(this.qt.jM, s._t, s.ut, s.Qi, s.$t));
      });
    }
    $M(t, i) {
      const { maxHeight: s, maxWidth: n, qM: e, YM: r, padding: h } = t,
        a = Math.round(i.width / 2),
        l = Math.round(i.height / 2),
        o = h ?? 0;
      let _ = i.width - 2 * o,
        u = i.height - 2 * o;
      s && (u = Math.min(u, s)), n && (_ = Math.min(_, n));
      const c = _ / r,
        d = u / e,
        f = Math.min(c, d),
        p = r * f,
        v = e * f;
      return { _t: a - 0.5 * p, ut: l - 0.5 * v, $t: v, Qi: p };
    }
  }
  class Ne {
    constructor(t) {
      (this.KM = null),
        (this.XM = 0),
        (this.ZM = 0),
        (this.Ps = t),
        (this.M = We(this.Ps, this.KM, this.XM, this.ZM));
    }
    GM(t) {
      void 0 !== t.JM && (this.XM = t.JM),
        void 0 !== t.QM && (this.ZM = t.QM),
        void 0 !== t.tb && (this.KM = t.tb),
        this.yt();
    }
    ib(t) {
      (this.Ps = t), this.yt();
    }
    zOrder() {
      return 'bottom';
    }
    yt() {
      this.M = We(this.Ps, this.KM, this.XM, this.ZM);
    }
    renderer() {
      return new Le(this.M);
    }
  }
  function We(t, i, s, n) {
    return { ...t, jM: i, YM: s, qM: n };
  }
  function Fe(t) {
    return { ...Oe, ...t };
  }
  class He {
    constructor(t, i) {
      (this.sb = null),
        (this.nb = t),
        (this.Ps = Fe(i)),
        (this.HM = [new Ne(this.Ps)]);
    }
    updateAllViews() {
      this.HM.forEach((t) => t.yt());
    }
    paneViews() {
      return this.HM;
    }
    attached(t) {
      const { requestUpdate: i } = t;
      (this.eb = i),
        (this.sb = new Image()),
        (this.sb.onload = () => {
          const t = this.sb?.naturalHeight ?? 1,
            i = this.sb?.naturalWidth ?? 1;
          this.HM.forEach((s) => s.GM({ QM: t, JM: i, tb: this.sb })),
            this.eb && this.eb();
        }),
        (this.sb.src = this.nb);
    }
    detached() {
      (this.eb = void 0), (this.sb = null);
    }
    hr(t) {
      (this.Ps = Fe({ ...this.Ps, ...t })), this.rb(), this.UM && this.UM();
    }
    UM() {
      this.eb && this.eb();
    }
    rb() {
      this.HM.forEach((t) => t.ib(this.Ps));
    }
  }
  class Ue {
    constructor(t, i) {
      (this.Jn = t), (this.ah = i), this.OM();
    }
    detach() {
      this.Jn.detachPrimitive(this.ah);
    }
    getSeries() {
      return this.Jn;
    }
    applyOptions(t) {
      this.ah && this.ah.hr && this.ah.hr(t);
    }
    OM() {
      this.Jn.attachPrimitive(this.ah);
    }
  }
  const $e = { zOrder: 'normal' };
  function je(t, i) {
    return Xt(Math.min(Math.max(t, 12), 30) * i);
  }
  function qe(t, i) {
    switch (t) {
      case 'arrowDown':
      case 'arrowUp':
        return je(i, 1);
      case 'circle':
        return je(i, 0.8);
      case 'square':
        return je(i, 0.7);
    }
  }
  function Ye(t) {
    return (function (t) {
      const i = Math.ceil(t);
      return i % 2 != 0 ? i - 1 : i;
    })(je(t, 1));
  }
  function Ke(t) {
    return Math.max(je(t, 0.1), 3);
  }
  function Xe(t, i, s) {
    return i ? t : s ? Math.ceil(t / 2) : 0;
  }
  function Ze(t, i, s, n) {
    const e = ((qe('arrowUp', n) - 1) / 2) * s.hb,
      r = ((Xt(n / 2) - 1) / 2) * s.hb;
    i.beginPath(),
      t
        ? (i.moveTo(s._t - e, s.ut),
          i.lineTo(s._t, s.ut - e),
          i.lineTo(s._t + e, s.ut),
          i.lineTo(s._t + r, s.ut),
          i.lineTo(s._t + r, s.ut + e),
          i.lineTo(s._t - r, s.ut + e),
          i.lineTo(s._t - r, s.ut))
        : (i.moveTo(s._t - e, s.ut),
          i.lineTo(s._t, s.ut + e),
          i.lineTo(s._t + e, s.ut),
          i.lineTo(s._t + r, s.ut),
          i.lineTo(s._t + r, s.ut - e),
          i.lineTo(s._t - r, s.ut - e),
          i.lineTo(s._t - r, s.ut)),
      i.fill();
  }
  function Ge(t, i, s, n, e, r) {
    const h = (qe('arrowUp', n) - 1) / 2,
      a = (Xt(n / 2) - 1) / 2;
    if (
      e >= i - a - 2 &&
      e <= i + a + 2 &&
      r >= (t ? s : s - h) - 2 &&
      r <= (t ? s + h : s) + 2
    )
      return !0;
    return (() => {
      if (
        e < i - h - 3 ||
        e > i + h + 3 ||
        r < (t ? s - h - 3 : s) ||
        r > (t ? s : s + h + 3)
      )
        return !1;
      const n = Math.abs(e - i);
      return Math.abs(r - s) + 3 >= n / 2;
    })();
  }
  class Je {
    constructor() {
      (this.qt = null),
        (this.Ln = new it()),
        (this.W = -1),
        (this.F = ''),
        (this.Wp = ''),
        (this.ab = 'normal');
    }
    ht(t) {
      this.qt = t;
    }
    Nn(t, i, s) {
      (this.W === t && this.F === i) ||
        ((this.W = t), (this.F = i), (this.Wp = g(t, i)), this.Ln.Vn()),
        (this.ab = s);
    }
    Yn(t, i) {
      if (null === this.qt || null === this.qt.lt) return null;
      for (let s = this.qt.lt.from; s < this.qt.lt.to; s++) {
        const n = this.qt.ot[s];
        if (n && tr(n, t, i))
          return { zOrder: 'normal', externalId: n.Kn ?? '' };
      }
      return null;
    }
    draw(t) {
      'aboveSeries' !== this.ab &&
        t.useBitmapCoordinateSpace((t) => {
          this.et(t);
        });
    }
    drawBackground(t) {
      'aboveSeries' === this.ab &&
        t.useBitmapCoordinateSpace((t) => {
          this.et(t);
        });
    }
    et({ context: t, horizontalPixelRatio: i, verticalPixelRatio: s }) {
      if (null !== this.qt && null !== this.qt.lt) {
        (t.textBaseline = 'middle'), (t.font = this.Wp);
        for (let n = this.qt.lt.from; n < this.qt.lt.to; n++) {
          const e = this.qt.ot[n];
          void 0 !== e.ri &&
            ((e.ri.Qi = this.Ln.Ei(t, e.ri.lb)),
            (e.ri.$t = this.W),
            (e.ri._t = e._t - e.ri.Qi / 2)),
            Qe(e, t, i, s);
        }
      }
    }
  }
  function Qe(t, i, s, n) {
    (i.fillStyle = t.R),
      void 0 !== t.ri &&
        (function (t, i, s, n, e, r) {
          t.save(), t.scale(e, r), t.fillText(i, s, n), t.restore();
        })(i, t.ri.lb, t.ri._t, t.ri.ut, s, n),
      (function (t, i, s) {
        if (0 === t.zr) return;
        switch (t.ob) {
          case 'arrowDown':
            return void Ze(!1, i, s, t.zr);
          case 'arrowUp':
            return void Ze(!0, i, s, t.zr);
          case 'circle':
            return void (function (t, i, s) {
              const n = (qe('circle', s) - 1) / 2;
              t.beginPath(),
                t.arc(i._t, i.ut, n * i.hb, 0, 2 * Math.PI, !1),
                t.fill();
            })(i, s, t.zr);
          case 'square':
            return void (function (t, i, s) {
              const n = qe('square', s),
                e = ((n - 1) * i.hb) / 2,
                r = i._t - e,
                h = i.ut - e;
              t.fillRect(r, h, n * i.hb, n * i.hb);
            })(i, s, t.zr);
        }
        t.ob;
      })(
        t,
        i,
        (function (t, i, s) {
          const n = (Math.max(1, Math.floor(i)) % 2) / 2;
          return { _t: Math.round(t._t * i) + n, ut: t.ut * s, hb: i };
        })(t, s, n),
      );
  }
  function tr(t, i, s) {
    return (
      !(
        void 0 === t.ri ||
        !(function (t, i, s, n, e, r) {
          const h = n / 2;
          return e >= t && e <= t + s && r >= i - h && r <= i + h;
        })(t.ri._t, t.ri.ut, t.ri.Qi, t.ri.$t, i, s)
      ) ||
      (function (t, i, s) {
        if (0 === t.zr) return !1;
        switch (t.ob) {
          case 'arrowDown':
            return Ge(!0, t._t, t.ut, t.zr, i, s);
          case 'arrowUp':
            return Ge(!1, t._t, t.ut, t.zr, i, s);
          case 'circle':
            return (function (t, i, s, n, e) {
              const r = 2 + qe('circle', s) / 2,
                h = t - n,
                a = i - e;
              return Math.sqrt(h * h + a * a) <= r;
            })(t._t, t.ut, t.zr, i, s);
          case 'square':
            return (function (t, i, s, n, e) {
              const r = qe('square', s),
                h = (r - 1) / 2,
                a = t - h,
                l = i - h;
              return n >= a && n <= a + r && e >= l && e <= l + r;
            })(t._t, t.ut, t.zr, i, s);
        }
      })(t, i, s)
    );
  }
  function ir(t) {
    return 'atPriceTop' === t || 'atPriceBottom' === t || 'atPriceMiddle' === t;
  }
  function sr(t, i, s, n, e, r, h, l) {
    const o = (function (t, i) {
      if (ir(i.position) && void 0 !== i.price) return i.price;
      if ('value' in (s = t) && 'number' == typeof s.value) return t.value;
      var s;
      if (
        (function (t) {
          return 'open' in t && 'high' in t && 'low' in t && 'close' in t;
        })(t)
      ) {
        if ('inBar' === i.position) return t.close;
        if ('aboveBar' === i.position) return t.high;
        if ('belowBar' === i.position) return t.low;
      }
    })(s, i);
    if (void 0 === o) return;
    const _ = ir(i.position),
      c = l.timeScale(),
      d = u(i.size) ? Math.max(i.size, 0) : 1,
      f = Ye(c.options().barSpacing) * d,
      p = f / 2;
    t.zr = f;
    switch (i.position) {
      case 'inBar':
      case 'atPriceMiddle':
        return (
          (t.ut = a(h.priceToCoordinate(o))),
          void (void 0 !== t.ri && (t.ri.ut = t.ut + p + r + 0.6 * e))
        );
      case 'aboveBar':
      case 'atPriceTop': {
        const i = _ ? 0 : n._b;
        return (
          (t.ut = a(h.priceToCoordinate(o)) - p - i),
          void 0 !== t.ri &&
            ((t.ri.ut = t.ut - p - 0.6 * e), (n._b += 1.2 * e)),
          void (_ || (n._b += f + r))
        );
      }
      case 'belowBar':
      case 'atPriceBottom': {
        const i = _ ? 0 : n.ub;
        return (
          (t.ut = a(h.priceToCoordinate(o)) + p + i),
          void 0 !== t.ri &&
            ((t.ri.ut = t.ut + p + r + 0.6 * e), (n.ub += 1.2 * e)),
          void (_ || (n.ub += f + r))
        );
      }
    }
  }
  class nr {
    constructor(t, i, s) {
      (this.cb = []),
        (this.St = !0),
        (this.fb = !0),
        (this.Gt = new Je()),
        (this.ge = t),
        (this.Dp = i),
        (this.qt = { ot: [], lt: null }),
        (this.Ps = s);
    }
    renderer() {
      if (!this.ge.options().visible) return null;
      this.St && this.pb();
      const t = this.Dp.options().layout;
      return (
        this.Gt.Nn(t.fontSize, t.fontFamily, this.Ps.zOrder),
        this.Gt.ht(this.qt),
        this.Gt
      );
    }
    mb(t) {
      (this.cb = t), this.yt('data');
    }
    yt(t) {
      (this.St = !0), 'data' === t && (this.fb = !0);
    }
    wb(t) {
      (this.St = !0), (this.Ps = t);
    }
    zOrder() {
      return 'aboveSeries' === this.Ps.zOrder ? 'top' : this.Ps.zOrder;
    }
    pb() {
      const t = this.Dp.timeScale(),
        i = this.cb;
      this.fb &&
        ((this.qt.ot = i.map((t) => ({
          wt: t.time,
          _t: 0,
          ut: 0,
          zr: 0,
          ob: t.shape,
          R: t.color,
          Kn: t.id,
          gb: t.gb,
          ri: void 0,
        }))),
        (this.fb = !1));
      const s = this.Dp.options().layout;
      this.qt.lt = null;
      const n = t.getVisibleLogicalRange();
      if (null === n) return;
      const e = new Si(Math.floor(n.from), Math.ceil(n.to));
      if (null === this.ge.data()[0]) return;
      if (0 === this.qt.ot.length) return;
      let r = NaN;
      const h = Ke(t.options().barSpacing),
        l = { _b: h, ub: h };
      this.qt.lt = _n(this.qt.ot, e, !0);
      for (let n = this.qt.lt.from; n < this.qt.lt.to; n++) {
        const e = i[n];
        e.time !== r && ((l._b = h), (l.ub = h), (r = e.time));
        const o = this.qt.ot[n];
        (o._t = a(t.logicalToCoordinate(e.time))),
          void 0 !== e.text &&
            e.text.length > 0 &&
            (o.ri = { lb: e.text, _t: 0, ut: 0, Qi: 0, $t: 0 });
        const _ = this.ge.dataByIndex(e.time, 0);
        null !== _ && sr(o, e, _, l, s.fontSize, h, this.ge, this.Dp);
      }
      this.St = !1;
    }
  }
  function er(t) {
    return { ...$e, ...t };
  }
  class rr {
    constructor(t) {
      (this.sh = null),
        (this.cb = []),
        (this.Mb = []),
        (this.bb = null),
        (this.ge = null),
        (this.Dp = null),
        (this.xb = !0),
        (this.Sb = null),
        (this.Cb = null),
        (this.Pb = null),
        (this.yb = !0),
        (this.Ps = er(t));
    }
    attached(t) {
      this.kb(),
        (this.Dp = t.chart),
        (this.ge = t.series),
        (this.sh = new nr(this.ge, a(this.Dp), this.Ps)),
        (this.eb = t.requestUpdate),
        this.ge.subscribeDataChanged((t) => this.Pg(t)),
        (this.yb = !0),
        this.UM();
    }
    UM() {
      this.eb && this.eb();
    }
    detached() {
      this.ge && this.bb && this.ge.unsubscribeDataChanged(this.bb),
        (this.Dp = null),
        (this.ge = null),
        (this.sh = null),
        (this.bb = null);
    }
    mb(t) {
      (this.yb = !0),
        (this.cb = t),
        this.kb(),
        (this.xb = !0),
        (this.Cb = null),
        this.UM();
    }
    Tb() {
      return this.cb;
    }
    paneViews() {
      return this.sh ? [this.sh] : [];
    }
    updateAllViews() {
      this.Rb();
    }
    hitTest(t, i) {
      return this.sh ? this.sh.renderer()?.Yn(t, i) ?? null : null;
    }
    autoscaleInfo(t, i) {
      if (this.sh) {
        const t = this.Db();
        if (t) return { priceRange: null, margins: t };
      }
      return null;
    }
    hr(t) {
      (this.Ps = er({ ...this.Ps, ...t })), this.UM && this.UM();
    }
    Db() {
      const t = a(this.Dp).timeScale().options().barSpacing;
      if (this.xb || t !== this.Pb) {
        if (((this.Pb = t), this.cb.length > 0)) {
          const i = Ke(t),
            s = 1.5 * Ye(t) + 2 * i,
            n = this.Eb();
          this.Sb = {
            above: Xe(s, n.aboveBar, n.inBar),
            below: Xe(s, n.belowBar, n.inBar),
          };
        } else this.Sb = null;
        this.xb = !1;
      }
      return this.Sb;
    }
    Eb() {
      return (
        null === this.Cb &&
          (this.Cb = this.cb.reduce(
            (t, i) => (t[i.position] || (t[i.position] = !0), t),
            {
              inBar: !1,
              aboveBar: !1,
              belowBar: !1,
              atPriceTop: !1,
              atPriceBottom: !1,
              atPriceMiddle: !1,
            },
          )),
        this.Cb
      );
    }
    kb() {
      if (!this.yb || !this.Dp || !this.ge) return;
      const t = this.Dp.timeScale(),
        i = this.ge?.data();
      if (null == t.getVisibleLogicalRange() || !this.ge || 0 === i.length)
        return void (this.Mb = []);
      const s = t.timeToIndex(a(i[0].time), !0);
      (this.Mb = this.cb.map((i, n) => {
        const e = t.timeToIndex(i.time, !0),
          r = e < s ? 1 : -1,
          h = a(this.ge).dataByIndex(e, r),
          l = {
            time: t.timeToIndex(a(h).time, !1),
            position: i.position,
            shape: i.shape,
            color: i.color,
            id: i.id,
            gb: n,
            text: i.text,
            size: i.size,
            price: i.price,
            Pw: i.time,
          };
        if (
          'atPriceTop' === i.position ||
          'atPriceBottom' === i.position ||
          'atPriceMiddle' === i.position
        ) {
          if (void 0 === i.price)
            throw new Error(`Price is required for position ${i.position}`);
          return { ...l, position: i.position, price: i.price };
        }
        return { ...l, position: i.position, price: i.price };
      })),
        (this.yb = !1);
    }
    Rb(t) {
      this.sh &&
        (this.kb(), this.sh.mb(this.Mb), this.sh.wb(this.Ps), this.sh.yt(t));
    }
    Pg(t) {
      (this.yb = !0), this.UM();
    }
  }
  class hr extends Ue {
    constructor(t, i, s) {
      super(t, i), s && this.setMarkers(s);
    }
    setMarkers(t) {
      this.ah.mb(t);
    }
    markers() {
      return this.ah.Tb();
    }
  }
  class ar {
    constructor(t) {
      (this.cb = new Map()), (this.Vb = t);
    }
    Bb(t, i, s) {
      if ((this.Ib(i), void 0 !== s)) {
        const n = window.setTimeout(() => {
            this.cb.delete(i), this.Ab();
          }, s),
          e = { ...t, zb: n, Ob: Date.now() + s };
        this.cb.set(i, e);
      } else this.cb.set(i, { ...t, zb: void 0, Ob: void 0 });
      this.Ab();
    }
    Ib(t) {
      const i = this.cb.get(t);
      i && void 0 !== i.zb && window.clearTimeout(i.zb),
        this.cb.delete(t),
        this.Ab();
    }
    Lb() {
      for (const [t] of this.cb) this.Ib(t);
    }
    Nb() {
      const t = Date.now(),
        i = [];
      for (const [s, n] of this.cb)
        !n.Ob || n.Ob > t
          ? i.push({ time: n.time, sign: n.sign, value: n.value })
          : this.Ib(s);
      return i;
    }
    Wb(t) {
      this.Vb = t;
    }
    Ab() {
      this.Vb && this.Vb();
    }
  }
  const lr = {
    positiveColor: '#22AB94',
    negativeColor: '#F7525F',
    updateVisibilityDuration: 5e3,
  };
  class or {
    constructor(t, i, s, n) {
      (this.qt = t), (this.Fb = i), (this.Hb = s), (this.Ub = n);
    }
    draw(t) {
      t.useBitmapCoordinateSpace((t) => {
        const i = t.context,
          s = (Math.max(1, Math.floor(t.horizontalPixelRatio)) % 2) / 2,
          n = 4 * t.verticalPixelRatio + s;
        this.qt.forEach((e) => {
          const r = Math.round(e._t * t.horizontalPixelRatio) + s;
          i.beginPath();
          const h = this.$b(e.jb);
          (i.fillStyle = h),
            i.arc(r, e.ut * t.verticalPixelRatio, n, 0, 2 * Math.PI, !1),
            i.fill(),
            e.jb &&
              ((i.strokeStyle = h),
              (i.lineWidth = Math.floor(2 * t.horizontalPixelRatio)),
              i.beginPath(),
              i.moveTo(
                (e._t - 4.7) * t.horizontalPixelRatio + s,
                (e.ut - 7 * e.jb) * t.verticalPixelRatio,
              ),
              i.lineTo(
                e._t * t.horizontalPixelRatio + s,
                (e.ut - 7 * e.jb - 7 * e.jb * 0.5) * t.verticalPixelRatio,
              ),
              i.lineTo(
                (e._t + 4.7) * t.horizontalPixelRatio + s,
                (e.ut - 7 * e.jb) * t.verticalPixelRatio,
              ),
              i.stroke());
        });
      });
    }
    $b(t) {
      return 0 === t ? this.Fb : t > 0 ? this.Ub : this.Hb;
    }
  }
  class _r {
    constructor(t, i, s) {
      (this.qt = []), (this.ge = t), (this.uh = i), (this.Ps = s);
    }
    yt(t) {
      this.qt = t
        .map((t) => {
          const i = this.ge.priceToCoordinate(t.value);
          if (null === i) return null;
          return { _t: a(this.uh.timeToCoordinate(t.time)), ut: i, jb: t.sign };
        })
        .filter(v);
    }
    renderer() {
      const t = (function (t, i) {
        return (function (t, i) {
          return 'Area' === i;
        })(0, i)
          ? t.lineColor
          : t.color;
      })(this.ge.options(), this.ge.seriesType());
      return new or(this.qt, t, this.Ps.negativeColor, this.Ps.positiveColor);
    }
  }
  function ur(t, i) {
    return 'Line' === i || 'Area' === i;
  }
  class cr {
    constructor(t) {
      (this.Dp = void 0),
        (this.ge = void 0),
        (this.HM = []),
        (this.o_ = null),
        (this.qb = new Map()),
        (this.Yb = new ar(() => this.UM())),
        (this.Ps = { ...lr, ...t });
    }
    hr(t) {
      (this.Ps = { ...this.Ps, ...t }), this.UM();
    }
    mb(t) {
      this.Yb.Lb();
      const i = this.o_;
      i &&
        t.forEach((t) => {
          this.Yb.Bb(t, i.key(t.time));
        });
    }
    Tb() {
      return this.Yb.Nb();
    }
    UM() {
      this.eb?.();
    }
    attached(t) {
      const { chart: i, series: s, requestUpdate: n, horzScaleBehavior: e } = t;
      (this.Dp = i), (this.ge = s), (this.o_ = e);
      const r = this.ge.seriesType();
      if ('Area' !== r && 'Line' !== r)
        throw new Error(
          'UpDownMarkersPrimitive is only supported for Area and Line series types',
        );
      (this.HM = [new _r(this.ge, this.Dp.timeScale(), this.Ps)]),
        (this.eb = n),
        this.UM();
    }
    detached() {
      (this.Dp = void 0), (this.ge = void 0), (this.eb = void 0);
    }
    $p() {
      return h(this.Dp);
    }
    Lo() {
      return h(this.ge);
    }
    updateAllViews() {
      this.HM.forEach((t) => t.yt(this.Tb()));
    }
    paneViews() {
      return this.HM;
    }
    ht(t) {
      if (!this.ge) throw new Error('Primitive not attached to series');
      const i = this.ge.seriesType();
      this.qb.clear();
      const s = this.o_;
      s &&
        t.forEach((t) => {
          js(t) && ur(0, i) && this.qb.set(s.key(t.time), t.value);
        }),
        h(this.ge).setData(t);
    }
    yt(t, i) {
      if (!this.ge || !this.o_)
        throw new Error('Primitive not attached to series');
      const s = this.ge.seriesType(),
        n = this.o_.key(t.time);
      if (($s(t) && this.qb.delete(n), js(t) && ur(0, s))) {
        const i = this.qb.get(n);
        i &&
          this.Yb.Bb(
            { time: t.time, value: t.value, sign: dr(t.value, i) },
            n,
            this.Ps.updateVisibilityDuration,
          );
      }
      h(this.ge).update(t, i);
    }
    Kb() {
      this.Yb.Lb();
    }
  }
  function dr(t, i) {
    return t === i ? 0 : t - i > 0 ? 1 : -1;
  }
  class fr extends Ue {
    setData(t) {
      return this.ah.ht(t);
    }
    update(t, i) {
      return this.ah.yt(t, i);
    }
    markers() {
      return this.ah.Tb();
    }
    setMarkers(t) {
      return this.ah.mb(t);
    }
    clearMarkers() {
      return this.ah.Kb();
    }
  }
  const pr = { ...t, color: '#2196f3' };
  var vr = Object.freeze({
    __proto__: null,
    AreaSeries: ve,
    BarSeries: Me,
    BaselineSeries: de,
    CandlestickSeries: Se,
    get ColorType() {
      return Vi;
    },
    get CrosshairMode() {
      return $;
    },
    HistogramSeries: ye,
    get LastPriceAnimationMode() {
      return Di;
    },
    LineSeries: Qn,
    get LineStyle() {
      return s;
    },
    get LineType() {
      return i;
    },
    get MismatchDirection() {
      return Ct;
    },
    get PriceLineSource() {
      return Ei;
    },
    get PriceScaleMode() {
      return ci;
    },
    get TickMarkType() {
      return Bi;
    },
    get TrackingModeExitMode() {
      return Ri;
    },
    createChart: function (t, i) {
      return Hn(t, new Ji(), Ji.ad(i));
    },
    createChartEx: Hn,
    createImageWatermark: function (t, i, s) {
      return new ke(t, new He(i, s));
    },
    createOptionsChart: function (t, i) {
      return Hn(t, new he(), i);
    },
    createSeriesMarkers: function (t, i, s) {
      const n = new hr(t, new rr(s ?? {}));
      return i && n.setMarkers(i), n;
    },
    createTextWatermark: function (t, i) {
      return new ke(t, new ze(i));
    },
    createUpDownMarkers: function (t, i = {}) {
      return new fr(t, new cr(i));
    },
    createYieldCurveChart: function (t, i) {
      const s = Fn(t);
      return new ee(s, i);
    },
    customSeriesDefaultOptions: pr,
    defaultHorzScaleBehavior: function () {
      return Ji;
    },
    isBusinessDay: Ai,
    isUTCTimestamp: zi,
    version: function () {
      return '5.0.8';
    },
  });
  window.LightweightCharts = vr;
})();
