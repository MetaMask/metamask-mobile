
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';

const config = [
  {
    external: ['bowser'],
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
      },
      {
        file: 'dist/index.es.js',
        format: 'es',
      },
    ],
    plugins: [
      resolve(),
      typescript(),
    ],
  }
];

export default config;
