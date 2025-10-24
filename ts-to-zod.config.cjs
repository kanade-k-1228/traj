/**
 * ts-to-zod configuration.
 *
 * @type {import("ts-to-zod").TsToZodConfig}
 */

const types = (name) => ({
  name,
  input: `src/type/${name}.ts`,
  output: `src/type/${name}.zod.ts`,
});

module.exports = [
  types("project"),
  types("cache"),
  types("package"),
  types("platform"),
];
