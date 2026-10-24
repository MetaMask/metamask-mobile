const React = require('react');

const Svg = ({ children, width, height }) =>
  React.createElement(
    'svg',
    { width, height, viewBox: `0 0 ${width ?? 24} ${height ?? 24}` },
    children,
  );

const empty = () => null;

module.exports = Svg;
module.exports.default = Svg;
module.exports.Svg = Svg;
module.exports.SvgXml = empty;
module.exports.SvgUri = empty;
module.exports.Rect = empty;
module.exports.Circle = empty;
module.exports.Path = empty;
module.exports.G = empty;
module.exports.Line = empty;
module.exports.Polygon = empty;
module.exports.Defs = empty;
module.exports.ClipPath = empty;
