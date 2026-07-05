import YAML from "yaml";

export function parseFrontmatter(text, filePath = "document") {
  if (!text.startsWith("---")) {
    return { attributes: {}, body: text };
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}`);
  }

  let attributes;
  try {
    attributes = YAML.parse(match[1]) ?? {};
  } catch (error) {
    throw new Error(`Could not parse YAML frontmatter in ${filePath}: ${error.message}`);
  }

  return {
    attributes,
    body: text.slice(match[0].length).trimStart()
  };
}

export function stringifyFrontmatter(attributes, body) {
  const yaml = YAML.stringify(attributes, {
    collectionStyle: "block",
    lineWidth: 0
  }).trimEnd();

  return `---\n${yaml}\n---\n\n${body.trimStart()}`;
}
