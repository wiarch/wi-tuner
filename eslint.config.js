import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/dist/**", "**/.astro/**", "**/node_modules/**", "**/coverage/**"],
  },
  ...tseslint.configs.recommended,
];

