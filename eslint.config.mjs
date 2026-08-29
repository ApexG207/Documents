import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These client surfaces intentionally hydrate from governed API routes on
      // mount. The requests are asynchronous and do not form render loops.
      "react-hooks/set-state-in-effect": "off",
      // Plain anchors are retained for resilient offline/PWA navigation.
      "@next/next/no-html-link-for-pages": "off",
      // User-owned R2 profile images use runtime URLs that are not compatible
      // with Next's compile-time image optimizer.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
