import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export default defineConfig({
  root: "./",
  plugins: [
    ...VitePluginNode({
      adapter: "express",
      appPath: "./src/app.ts",
      tsCompiler: "esbuild",
    }),
  ],

  server: {
    port: 3000,
  },

  build: {
    target: "node20",
    outDir: "dist",

    lib: {
      entry: path.resolve(__dirname, "src/app.ts"),
      formats: ["es"],
      fileName: () => "index.mjs",
    },

    rollupOptions: {
      external: getPackageDependencies(),
      output: {
        inlineDynamicImports: false,
        entryFileNames: "index.mjs",
      },
    },

    minify: "esbuild",
    sourcemap: true,
  },
});

function getPackageDependencies() {
  const packageJsonPath = path.resolve(__dirname, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    const dependencies = Object.keys(packageJson.dependencies || {});
    const peerDependencies = Object.keys(packageJson.peerDependencies || {});

    const builtInModules = [
      "assert",
      "buffer",
      "child_process",
      "cluster",
      "crypto",
      "dgram",
      "dns",
      "events",
      "fs",
      "http",
      "https",
      "module",
      "net",
      "os",
      "path",
      "perf_hooks",
      "process",
      "querystring",
      "readline",
      "repl",
      "stream",
      "string_decoder",
      "timers",
      "tls",
      "url",
      "util",
      "v8",
      "vm",
      "worker_threads",
      "zlib",
    ].map((mod) => `node:${mod}`);

    return [...dependencies, ...peerDependencies, ...builtInModules];
  }

  return [];
}
