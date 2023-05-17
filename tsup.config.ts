// tsup.config.ts
import type { Options } from "tsup";
export const tsup: Options = {
  clean: true,
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  entryPoints: [
    "src/index.ts",
    "src/node.ts"
  ],
  external: ['esbuild']
};
