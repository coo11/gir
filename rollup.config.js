import copy from "rollup-plugin-copy";
import { terser } from "rollup-plugin-terser";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/js/main.js",
  output: {
    file: "dist/main.min.js",
    format: "iife",
    sourcemap: false,
  },
  plugins: [
    copy({
      targets: [
        {
          src: [
            "src/css/main.min.css",
            "src/index.html",
            "src/favicon.ico",
            "src/apple-touch-icon.png",
          ],
          dest: "dist",
        },
      ],
    }),
    commonjs({
      include: /node_modules/, // https://github.com/rollup/rollup-plugin-commonjs/issues/361#issuecomment-445214136
    }),
    resolve({
      browser: true,
    }),
    terser(),
  ],
  external: ["jquery", "bootstrap"],
};
