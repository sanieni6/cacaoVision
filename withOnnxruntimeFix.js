const {
  withAppBuildGradle,
  withMainApplication,
} = require("@expo/config-plugins");

/**
 * Expo config plugin that:
 * 1. Adds packagingOptions to pick first libreactnative.so (fixes duplicate .so conflict)
 * 2. Registers OnnxruntimePackage in MainApplication (onnxruntime-react-native lacks
 *    react-native.config.js so RN autolinking doesn't pick it up)
 */
function withOnnxruntimeFix(config) {
  // Fix 1: packagingOptions for duplicate .so
  config = withAppBuildGradle(config, (gradleConfig) => {
    const contents = gradleConfig.modResults.contents;

    if (contents.includes("pickFirst '**/libreactnative.so'")) {
      return gradleConfig;
    }

    const androidBlockRegex = /android\s*\{/;
    const match = contents.match(androidBlockRegex);

    if (match) {
      const insertIndex = match.index + match[0].length;
      const packagingBlock = `
    packagingOptions {
        pickFirst '**/libreactnative.so'
    }`;
      gradleConfig.modResults.contents =
        contents.slice(0, insertIndex) +
        packagingBlock +
        contents.slice(insertIndex);
    }

    return gradleConfig;
  });

  // Fix 2: Register OnnxruntimePackage in MainApplication.kt
  config = withMainApplication(config, (mainAppConfig) => {
    let contents = mainAppConfig.modResults.contents;

    if (contents.includes("OnnxruntimePackage")) {
      return mainAppConfig;
    }

    // Add import after last import line
    const importLine = "import ai.onnxruntime.reactnative.OnnxruntimePackage";
    const lastImportIndex = contents.lastIndexOf("import ");
    const endOfLastImport = contents.indexOf("\n", lastImportIndex);
    contents =
      contents.slice(0, endOfLastImport + 1) +
      importLine +
      "\n" +
      contents.slice(endOfLastImport + 1);

    // Add package registration inside the .apply { } block
    contents = contents.replace(
      /\.packages\.apply\s*\{/,
      `.packages.apply {\n              add(OnnxruntimePackage())`
    );

    mainAppConfig.modResults.contents = contents;
    return mainAppConfig;
  });

  return config;
}

module.exports = withOnnxruntimeFix;
