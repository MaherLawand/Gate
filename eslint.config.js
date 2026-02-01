// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
]);
