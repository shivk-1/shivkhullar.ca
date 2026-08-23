import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third party: the draco decoder three ships, copied in so the
    // compressed model can be read without fetching a decoder from a cdn.
    // Minified upstream code, not ours to lint.
    "public/draco/**",
  ]),
]);

export default eslintConfig;
