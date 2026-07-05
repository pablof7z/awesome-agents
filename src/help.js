import { stripVTControlCharacters } from "node:util";
import { PACKAGE_NAME, SUPPORTED_AGENTS } from "./constants.js";

const reset = "\x1b[0m";
const codes = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  command: "\x1b[38;5;110m",
  option: "\x1b[38;5;81m",
  profile: "\x1b[38;5;149m",
  path: "\x1b[38;5;145m",
  success: "\x1b[38;5;108m",
  warning: "\x1b[38;5;179m",
  error: "\x1b[38;5;203m",
  bannerA: "\x1b[38;5;111m",
  bannerB: "\x1b[38;5;109m",
  bannerC: "\x1b[38;5;149m"
};

export const ui = {
  bold: (value) => color(value, codes.bold),
  command: (value) => color(value, codes.command),
  option: (value) => color(value, codes.option),
  profile: (value) => color(value, codes.profile),
  path: (value) => color(value, codes.path),
  success: (value) => color(value, codes.success),
  warning: (value) => color(value, codes.warning),
  error: (value) => color(value, codes.error),
  dim: (value) => color(value, codes.dim),
  prompt: () => color("$", codes.success)
};

export function configureHelp(program) {
  program.configureOutput({
    getOutHasColors: shouldUseColor,
    getErrHasColors: shouldUseColor,
    stripColor: (value) => stripVTControlCharacters(value)
  });

  program.configureHelp({
    formatHelp(command) {
      return formatHelp(command);
    }
  });
}

function formatHelp(command) {
  const name = command.name();
  const definition = command.parent ? commandHelp[name] : mainHelp;
  return renderHelp(definition ?? genericHelp(command));
}

function renderHelp(definition) {
  const lines = [];

  if (definition.banner) {
    lines.push(...definition.banner, "");
  }

  lines.push(`${ui.bold("Usage:")} ${definition.usage}`, "");

  if (definition.description) {
    lines.push(definition.description, "");
  }

  for (const section of definition.sections) {
    lines.push(`${ui.bold(section.title)}`);
    for (const row of section.rows) {
      lines.push(formatRow(row));
    }
    lines.push("");
  }

  if (definition.examples?.length) {
    lines.push(ui.bold("Examples:"));
    for (const example of definition.examples) {
      lines.push(formatExample(example));
    }
    lines.push("");
  }

  if (definition.footer) {
    lines.push(definition.footer);
  }

  return `${trimBlankLines(lines).join("\n")}\n`;
}

function formatRow(row) {
  if (typeof row === "string") {
    return `  ${row}`;
  }

  const term = row.term ?? "";
  const description = row.description ?? "";
  const detail = row.detail ?? [];
  const first = `  ${padVisible(term, row.width ?? 30)} ${description}`.trimEnd();
  const lines = [first];

  for (const value of detail) {
    lines.push(`  ${" ".repeat(row.width ?? 30)} ${value}`.trimEnd());
  }

  return lines.join("\n");
}

function formatExample(example) {
  const comment = example.comment ? `  ${ui.dim(`# ${example.comment}`)}` : "";
  return `  ${ui.prompt()} ${example.command}${comment}`;
}

function genericHelp(command) {
  return {
    usage: command.usage(),
    description: command.description(),
    sections: [
      {
        title: "Options:",
        rows: command.options.map((option) => ({
          term: ui.option(option.flags),
          description: option.description
        }))
      }
    ]
  };
}

function trimBlankLines(lines) {
  const result = [...lines];
  while (result.at(-1) === "") {
    result.pop();
  }
  return result;
}

function padVisible(value, width) {
  const visible = stripVTControlCharacters(value).length;
  return `${value}${" ".repeat(Math.max(0, width - visible))}`;
}

function color(value, code) {
  return shouldUseColor() ? `${code}${value}${reset}` : value;
}

function shouldUseColor() {
  if (
    process.env.NO_COLOR ||
    process.env.FORCE_COLOR === "0" ||
    process.env.FORCE_COLOR === "false" ||
    process.env.CLICOLOR === "0" ||
    process.env.TERM === "dumb"
  ) {
    return false;
  }
  return true;
}

export function formatMissingSourceError(commandName = "add") {
  return [
    "",
    ` ${ui.error("ERROR")}  Missing required argument: source`,
    "",
    "  Usage:",
    `    npx ${PACKAGE_NAME} ${commandName} <source> [options]`,
    "",
    "  Examples:",
    `    npx ${PACKAGE_NAME} ${commandName} ${exampleSource} --agent ${exampleProfile}`,
    `    npx ${PACKAGE_NAME} ${commandName} ./agents-source --list`,
    "",
    "  Tip:",
    `    Sources contain ${stripVTControlCharacters(sourceHint)}. Use --list before installing.`,
    ""
  ].join("\n");
}

const sourceHint = `${ui.profile("agents/profiles/*.{agent.yaml,agf.yaml,md}")} plus optional ${ui.profile("agents/adapters/<harness>/*")}`;
const harnesses = SUPPORTED_AGENTS.join("|");
const exampleSource = "owner/repo";
const exampleProfile = "triage-agent";
const banner = [
  color("     _                                                     ", codes.bannerA),
  color("    /_\\ __      _____  ___  ___  _ __ ___   ___          ", codes.bannerA),
  color("   //_\\\\ \\ /\\ / / _ \\/ __|/ _ \\| '_ ` _ \\ / _ \\         ", codes.bannerB),
  color("  /  _  \\ V  V /  __/\\__ \\ (_) | | | | | |  __/         ", codes.bannerB),
  color("  \\_/ \\_/\\_/\\_/ \\___||___/\\___/|_| |_| |_|\\___|         ", codes.bannerC),
  color("                         __ _  __ _  ___ _ __ | |_ ___   ", codes.bannerC),
  color("                        / _` |/ _` |/ _ \\ '_ \\| __/ __|  ", codes.bannerB),
  color("                       | (_| | (_| |  __/ | | | |_\\__ \\  ", codes.bannerB),
  color("                        \\__,_|\\__, |\\___|_| |_|\\__|___/  ", codes.bannerA),
  color("                              |___/                       ", codes.bannerA),
  `  ${ui.dim("Operational profiles for Codex, Claude Code, and OpenCode")}`
];

const mainHelp = {
  banner,
  usage: `${PACKAGE_NAME} <command> [options]`,
  description: "Install reusable operational agent profiles into Codex, Claude Code, and OpenCode.",
  sections: [
    {
      title: "Manage Profiles:",
      rows: [
        {
          term: `${ui.command("add")} <source>`,
          description: "Install profiles from a source (alias: install)",
          detail: [
            `e.g. ${ui.path(exampleSource)}`,
            `     ${ui.path("./agents-source")}`
          ]
        },
        {
          term: `${ui.command("use")} <source>`,
          description: "Print one rendered profile without installing it"
        },
        {
          term: `${ui.command("remove")} [profiles...]`,
          description: "Remove installed profiles (alias: rm)"
        },
        {
          term: `${ui.command("list")}, ${ui.command("ls")}`,
          description: "List installed profiles"
        }
      ]
    },
    {
      title: "Updates:",
      rows: [
        {
          term: `${ui.command("update")} [profiles...]`,
          description: "Reinstall profiles from their recorded source (alias: upgrade)"
        }
      ]
    },
    {
      title: "Project:",
      rows: [
        {
          term: `${ui.command("init")} [name]`,
          description: "Initialize an agent-profile source layout"
        }
      ]
    },
    {
      title: "Add Options:",
      rows: installOptions()
    },
    {
      title: "Use Options:",
      rows: useOptions()
    },
    {
      title: "List Options:",
      rows: listOptions()
    },
    {
      title: "Remove Options:",
      rows: removeOptions()
    },
    {
      title: "Update Options:",
      rows: updateOptions()
    },
    {
      title: "Options:",
      rows: [
        { term: ui.option("-h, --help"), description: "Show this help message" },
        { term: ui.option("-v, --version"), description: "Show version number" }
      ]
    }
  ],
  examples: [
    { command: `${PACKAGE_NAME} add ${exampleSource} --list`, comment: "inspect source profiles" },
    { command: `${PACKAGE_NAME} add ${exampleSource} --agent ${exampleProfile}` },
    { command: `${PACKAGE_NAME} add ${exampleSource} --agent ${exampleProfile} --harness opencode` },
    { command: `${PACKAGE_NAME} add ${exampleSource} --all --dry-run`, comment: "preview every write" },
    { command: `${PACKAGE_NAME} use ${exampleSource}@${exampleProfile} --harness claude-code` },
    { command: `${PACKAGE_NAME} list --json`, comment: "machine-readable output" },
    { command: `${PACKAGE_NAME} remove ${exampleProfile} --agent codex --dry-run` },
    { command: `${PACKAGE_NAME} update ${exampleProfile} --agent codex` }
  ],
  footer: `Sources use ${sourceHint}. Set ${ui.option("NO_COLOR=1")} to disable ANSI color.`
};

const commandHelp = {
  add: {
    usage: `${PACKAGE_NAME} add <source> [profile options] [target options]`,
    description: "Install harness-native agent profile files from a repository or local checkout.",
    sections: [
      {
        title: "Install Flow:",
        rows: [
          "1. Read canonical profiles from agents/profiles/*.{agent.yaml,agf.yaml,md}.",
          "2. Merge optional harness notes from agents/adapters/<harness>/*.",
          "3. Render Codex, Claude Code, or OpenCode files and record them in the registry."
        ]
      },
      {
        title: "Source Forms:",
        rows: [
          { term: ui.path("owner/repo"), description: "Shallow-clone a GitHub repository" },
          { term: ui.path("https://github.com/owner/repo"), description: "Use an explicit GitHub URL" },
          { term: ui.path("./agents-source"), description: "Use a local source checkout" },
          { term: ui.path("~/agents-source"), description: "Use a home-relative local source" }
        ]
      },
      {
        title: "Select Profiles:",
        rows: [
          { term: ui.option("--agent triage-agent"), description: "Preferred shorthand: install one profile slug" },
          { term: ui.option("--profile triage-agent"), description: "Explicit profile selector" },
          { term: ui.option("--skill triage-agent"), description: "Compatibility alias for --profile" },
          { term: ui.option("--all"), description: "Install every source profile" },
          { term: ui.option("--list"), description: "Show available profiles and exit" }
        ]
      },
      {
        title: "Choose Targets:",
        rows: [
          { term: ui.option("(default)"), description: "Codex, installed globally as a config profile" },
          { term: ui.option("--harness opencode"), description: "Render for one harness" },
          { term: ui.option("--harness codex claude-code"), description: "Render for multiple harnesses" },
          { term: ui.option("--harness *"), description: "Render for every supported harness" },
          { term: ui.option("--global"), description: "Install into the user-level harness directory" },
          { term: ui.option("--project"), description: "Install project-local files where the harness supports it" }
        ]
      },
      {
        title: "Target Files:",
        rows: [
          { term: ui.command("codex"), description: `${ui.path("~/.codex/<profile>.config.toml")} (project-local Codex profiles are not supported)` },
          { term: ui.command("claude-code"), description: `${ui.path("~/.claude/agents/<profile>.md")} or ${ui.path(".claude/agents/<profile>.md")}` },
          { term: ui.command("opencode"), description: `${ui.path("~/.config/opencode/agents/<profile>.md")} or ${ui.path(".opencode/agents/<profile>.md")}` },
          { term: ui.command("registry"), description: `${ui.path("~/.awesome-agents/installed.json")} or ${ui.path(".awesome-agents/installed.json")}` }
        ]
      },
      {
        title: "Safety And Output:",
        rows: [
          `Existing files are overwritten only when they contain ${ui.profile("Generated by awesome-agents")}.`,
          `${ui.option("--dry-run")} previews target files and registry writes.`,
          `${ui.option("--force")} overrides the generated-marker check.`,
          `${ui.option("--json")} prints machine-readable output without ANSI color.`,
          `${ui.option("--home <dir>")} overrides HOME for tests and scripted installs.`
        ]
      }
    ],
    examples: [
      { command: `${PACKAGE_NAME} add ${exampleSource} --list` },
      { command: `${PACKAGE_NAME} add ${exampleSource} --agent ${exampleProfile}` },
      { command: `${PACKAGE_NAME} add ${exampleSource} --agent ${exampleProfile} --harness codex opencode` },
      { command: `${PACKAGE_NAME} add ${exampleSource} --all --dry-run` }
    ],
    footer: `Generated files are marked with ${ui.profile("Generated by awesome-agents")}.`
  },
  install: {
    usage: `${PACKAGE_NAME} install <source> [profile options] [target options]`,
    description: `${ui.command("install")} is an alias for ${ui.command("add")}.`,
    sections: [
      { title: "Options:", rows: installOptions({ includeHome: true }) }
    ],
    examples: [
      { command: `${PACKAGE_NAME} install ${exampleSource} --agent ${exampleProfile}` }
    ]
  },
  use: {
    usage: `${PACKAGE_NAME} use <source> [options]`,
    description: "Render one profile to stdout without installing it.",
    sections: [
      {
        title: "Arguments:",
        rows: [
          { term: ui.profile("source"), description: "Source plus optional profile, for example owner/repo@profile" }
        ]
      },
      { title: "Options:", rows: useOptions({ includeHome: true }) }
    ],
    examples: [
      { command: `${PACKAGE_NAME} use ${exampleSource}@${exampleProfile} --harness codex` },
      { command: `${PACKAGE_NAME} use ${exampleSource} --agent ${exampleProfile} --harness claude-code` }
    ]
  },
  list: {
    usage: `${PACKAGE_NAME} list|ls [options]`,
    description: "List profiles recorded in the awesome-agents registry.",
    sections: [
      { title: "Options:", rows: listOptions({ includeHome: true }) }
    ],
    examples: [
      { command: `${PACKAGE_NAME} list` },
      { command: `${PACKAGE_NAME} ls --global --agent opencode` },
      { command: `${PACKAGE_NAME} ls --json` }
    ]
  },
  remove: {
    usage: `${PACKAGE_NAME} remove|rm [profiles...] [options]`,
    description: "Remove generated profile files and update the registry.",
    sections: [
      {
        title: "Arguments:",
        rows: [
          { term: ui.profile("profiles"), description: "Installed profile slugs to remove" }
        ]
      },
      { title: "Options:", rows: removeOptions({ includeHome: true }) }
    ],
    examples: [
      { command: `${PACKAGE_NAME} remove ${exampleProfile} --agent codex --dry-run` },
      { command: `${PACKAGE_NAME} rm --all --global` }
    ],
    footer: `By default, remove only deletes files marked with ${ui.profile("Generated by awesome-agents")}.`
  },
  update: {
    usage: `${PACKAGE_NAME} update|upgrade [profiles...] [options]`,
    description: "Reinstall recorded profiles from their original source.",
    sections: [
      {
        title: "Arguments:",
        rows: [
          { term: ui.profile("profiles"), description: "Installed profile slugs to update" }
        ]
      },
      { title: "Options:", rows: updateOptions({ includeHome: true }) }
    ],
    examples: [
      { command: `${PACKAGE_NAME} update` },
      { command: `${PACKAGE_NAME} update ${exampleProfile} --agent codex --dry-run` },
      { command: `${PACKAGE_NAME} upgrade --global --json` }
    ]
  },
  init: {
    usage: `${PACKAGE_NAME} init [name] [options]`,
    description: "Create a profile source layout in the current directory.",
    sections: [
      {
        title: "Arguments:",
        rows: [
          { term: ui.profile("name"), description: "New profile slug" }
        ]
      },
      { title: "Options:", rows: initOptions() }
    ],
    examples: [
      { command: `${PACKAGE_NAME} init ios-release-manager` },
      { command: `${PACKAGE_NAME} init --dry-run` }
    ],
    footer: `Creates ${sourceHint}.`
  }
};

function installOptions({ includeHome = false } = {}) {
  return compact([
    { term: ui.option("-g, --global"), description: "Install globally instead of into the current project" },
    { term: ui.option("-p, --project"), description: "Install into the current project; not supported for Codex profiles" },
    { term: ui.option("-a, --agent <profiles...>"), description: "Select agent profile slugs; harness names still work for compatibility" },
    { term: ui.option("--harness <harnesses...>"), description: `Select target harnesses: ${harnesses}, or *` },
    { term: ui.option("-s, --profile <profiles...>"), description: "Explicit profile selector; accepts *" },
    { term: ui.option("--skill <profiles...>"), description: "Compatibility alias for --profile" },
    { term: ui.option("-l, --list"), description: "List available source profiles without installing" },
    { term: ui.option("--all"), description: "Install all profiles to all supported harnesses" },
    { term: ui.option("-y, --yes"), description: "Accepted for npx skills parity; prompts are not used" },
    { term: ui.option("--dry-run"), description: "Print planned installs without writing files" },
    { term: ui.option("--force"), description: "Allow overwriting files without the generated marker" },
    { term: ui.option("--json"), description: "Output JSON without ANSI color" },
    includeHome ? { term: ui.option("--home <dir>"), description: "Override HOME for path expansion" } : null,
    { term: ui.option("-h, --help"), description: "Show command help" }
  ]);
}

function useOptions({ includeHome = false } = {}) {
  return compact([
    { term: ui.option("-s, --profile <profile>"), description: "Profile slug to render" },
    { term: ui.option("--skill <profile>"), description: "Compatibility alias for --profile" },
    { term: ui.option("-a, --agent <profile|harness>"), description: "Profile selector; harness names still work for compatibility" },
    { term: ui.option("--harness <harness>"), description: `Target harness renderer: ${harnesses}` },
    { term: ui.option("--json"), description: "Output rendered content plus metadata as JSON" },
    includeHome ? { term: ui.option("--home <dir>"), description: "Override HOME for path expansion" } : null,
    { term: ui.option("-h, --help"), description: "Show command help" }
  ]);
}

function listOptions({ includeHome = false } = {}) {
  return compact([
    { term: ui.option("-g, --global"), description: "List global installs" },
    { term: ui.option("-p, --project"), description: "List project installs" },
    { term: ui.option("-a, --agent <harnesses...>"), description: "Filter by target harness" },
    { term: ui.option("--json"), description: "Output JSON without ANSI color" },
    includeHome ? { term: ui.option("--home <dir>"), description: "Override HOME for path expansion" } : null,
    { term: ui.option("-h, --help"), description: "Show command help" }
  ]);
}

function removeOptions({ includeHome = false } = {}) {
  return compact([
    { term: ui.option("-g, --global"), description: "Remove global installs" },
    { term: ui.option("-p, --project"), description: "Remove project installs" },
    { term: ui.option("-a, --agent <harnesses...>"), description: "Filter by target harness" },
    { term: ui.option("--all"), description: "Remove every matching installed profile" },
    { term: ui.option("-y, --yes"), description: "Accepted for npx skills parity; prompts are not used" },
    { term: ui.option("--dry-run"), description: "Print planned removals without deleting files" },
    { term: ui.option("--force"), description: "Allow removing files without the generated marker" },
    { term: ui.option("--json"), description: "Output JSON without ANSI color" },
    includeHome ? { term: ui.option("--home <dir>"), description: "Override HOME for path expansion" } : null,
    { term: ui.option("-h, --help"), description: "Show command help" }
  ]);
}

function updateOptions({ includeHome = false } = {}) {
  return compact([
    { term: ui.option("-g, --global"), description: "Update global installs" },
    { term: ui.option("-p, --project"), description: "Update project installs" },
    { term: ui.option("-a, --agent <harnesses...>"), description: "Filter by target harness" },
    { term: ui.option("-y, --yes"), description: "Accepted for npx skills parity; prompts are not used" },
    { term: ui.option("--dry-run"), description: "Print planned updates without writing files" },
    { term: ui.option("--json"), description: "Output JSON without ANSI color" },
    includeHome ? { term: ui.option("--home <dir>"), description: "Override HOME for path expansion" } : null,
    { term: ui.option("-h, --help"), description: "Show command help" }
  ]);
}

function initOptions() {
  return [
    { term: ui.option("--dry-run"), description: "Print planned files without writing" },
    { term: ui.option("--force"), description: "Overwrite existing initialized files" },
    { term: ui.option("--json"), description: "Output JSON without ANSI color" },
    { term: ui.option("-h, --help"), description: "Show command help" }
  ];
}

function compact(values) {
  return values.filter(Boolean);
}
