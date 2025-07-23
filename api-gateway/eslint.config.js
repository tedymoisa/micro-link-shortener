import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      js,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    ...js.configs.recommended,
    rules: {
      ...js.configs.recommended.rules,
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/export": "error",
      "no-unused-vars": "error",
      "prettier/prettier": "error",
    },
    settings: {
      "import/resolver": {
        typescript: {},
      },
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommended,
]);
