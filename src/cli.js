import { Command } from "commander";
import { PACKAGE_NAME, PACKAGE_VERSION, SUPPORTED_AGENTS } from "./constants.js";
import { configureHelp, ui } from "./help.js";
import {
  initProfile,
  installFromSource,
  listAvailable,
  listInstalled,
  removeInstalled,
  updateInstalled,
  useFromSource
} from "./installer.js";

export async function run(argv = process.argv) {
  const program = new Command();
  program
    .name(PACKAGE_NAME)
    .description("Install reusable agent profiles into Codex, Claude Code, and OpenCode.")
    .version(PACKAGE_VERSION, "-v, --version")
    .helpOption("-h, --help", "Show this help message")
    .showHelpAfterError();

  configureHelp(program);

  addInstallCommand(program, "add");
  addInstallCommand(program, "install");

  program
    .command("use")
    .argument("<source>", "Source plus profile, for example owner/repo@profile")
    .description("Print one rendered agent profile without installing it")
    .option("-s, --profile <profile>", "Profile slug to use")
    .option("--skill <profile>", "Compatibility alias for --profile")
    .option("-a, --agent <agent>", "Agent profile slug to use; accepts a harness name for backward compatibility")
    .option("--harness <harness>", `Target harness (${SUPPORTED_AGENTS.join(", ")})`)
    .option("--target <harness>", "Compatibility alias for --harness")
    .option("--json", "Output JSON")
    .option("--home <dir>", "Override HOME for path expansion")
    .action(async (source = undefined, options) => {
      const result = await useFromSource(source, options);
      if (options.json) {
        printJson(result);
      } else {
        process.stdout.write(result.content);
      }
    });

  program
    .command("list")
    .alias("ls")
    .description("List installed agent profiles")
    .option("-g, --global", "List global installs")
    .option("-p, --project", "List project installs")
    .option("-a, --agent <agents...>", "Filter by agent harness")
    .option("--json", "Output JSON")
    .option("--home <dir>", "Override HOME for path expansion")
    .action(async (options) => {
      const result = await listInstalled(options);
      if (options.json) {
        printJson(result);
      } else {
        printInstalled(result);
      }
    });

  program
    .command("remove")
    .alias("rm")
    .argument("[profiles...]", "Installed profile slugs to remove")
    .description("Remove installed agent profiles")
    .option("-g, --global", "Remove global installs")
    .option("-p, --project", "Remove project installs")
    .option("-a, --agent <agents...>", "Filter by agent harness")
    .option("-y, --yes", "Accepted for npx skills parity; prompts are not used")
    .option("--all", "Remove all matching installed profiles")
    .option("--dry-run", "Print planned removals without deleting files")
    .option("--force", "Allow removing files without the generated marker")
    .option("--json", "Output JSON")
    .option("--home <dir>", "Override HOME for path expansion")
    .action(async (profiles, options) => {
      const result = await removeInstalled(profiles, options);
      if (options.json) {
        printJson(result);
      } else {
        printOperations(result.operations, result.registryPath, result.runInstructions);
      }
    });

  program
    .command("update")
    .alias("upgrade")
    .argument("[profiles...]", "Installed profile slugs to update")
    .description("Update installed agent profiles from their original source")
    .option("-g, --global", "Update global installs")
    .option("-p, --project", "Update project installs")
    .option("-a, --agent <agents...>", "Filter by agent harness")
    .option("-y, --yes", "Accepted for npx skills parity; prompts are not used")
    .option("--dry-run", "Print planned updates without writing files")
    .option("--json", "Output JSON")
    .option("--home <dir>", "Override HOME for path expansion")
    .action(async (profiles, options) => {
      const result = await updateInstalled(profiles, options);
      if (options.json) {
        printJson(result);
      } else {
        printOperations(result.operations, result.registryPath, result.runInstructions);
      }
    });

  program
    .command("init")
    .argument("[name]", "New profile slug")
    .description("Initialize a profile source layout in the current directory")
    .option("--dry-run", "Print planned files without writing")
    .option("--force", "Overwrite existing initialized files")
    .option("--json", "Output JSON")
    .action(async (name, options) => {
      const result = await initProfile(name, { ...options, cwd: process.cwd() });
      if (options.json) {
        printJson(result);
      } else {
        console.log(`${ui.success(result.action)}:`);
        for (const file of result.files) {
          console.log(`  ${ui.path(file)}`);
        }
      }
    });

  if (argv.length <= 2) {
    program.help();
    return;
  }

  await program.parseAsync(argv);
}

function addInstallCommand(program, commandName) {
  program
    .command(commandName)
    .argument("<source>", "Local path, GitHub owner/repo, or GitHub URL")
    .description(commandName === "install" ? "Alias for add" : "Install agent profiles from a source")
    .option("-g, --global", "Install globally")
    .option("-p, --project", "Install into the current project; not supported for Codex profiles")
    .option("-a, --agent <agents...>", "Agent profile slugs to install; accepts harness names for backward compatibility")
    .option("--harness <harnesses...>", `Target harnesses (${SUPPORTED_AGENTS.join(", ")}, or *)`)
    .option("--target <harnesses...>", "Compatibility alias for --harness")
    .option("-s, --profile <profiles...>", "Profile slugs to install (or *)")
    .option("--skill <profiles...>", "Compatibility alias for --profile")
    .option("-l, --list", "List available profiles in the source without installing")
    .option("-y, --yes", "Accepted for npx skills parity; prompts are not used")
    .option("--all", "Install all profiles to all supported agents")
    .option("--dry-run", "Print planned installs without writing files")
    .option("--force", "Allow overwriting files without the generated marker")
    .option("--json", "Output JSON")
    .option("--home <dir>", "Override HOME for path expansion")
    .action(async (source = undefined, options) => {
      if (options.list) {
        const profiles = await listAvailable(source, options);
        if (options.json) {
          printJson({ profiles });
        } else {
          printAvailable(profiles);
        }
        return;
      }

      const result = await installFromSource(source, options);
      if (options.json) {
        printJson(result);
      } else {
        printOperations(result.operations, result.registryPath, result.runInstructions);
      }
    });
}

function printAvailable(profiles) {
  if (profiles.length === 0) {
    console.log(ui.warning("No profiles found."));
    return;
  }
  console.log(ui.bold("Available profiles:"));
  for (const profile of profiles) {
    console.log(`  ${ui.profile(profile.slug)}  ${profile.summary || profile.name}`);
  }
}

function printInstalled(result) {
  if (result.installs.length === 0) {
    console.log(ui.warning(`No ${result.scope} profiles installed.`));
    return;
  }

  console.log(ui.bold(`${result.scope} profiles:`));
  for (const install of result.installs) {
    const missing = install.exists ? "" : ` ${ui.warning("(missing target)")}`;
    console.log(`  ${ui.profile(install.profile)}  ${ui.command(install.harness)}  ${ui.path(install.target)}${missing}`);
  }
  console.log(`${ui.bold("Registry:")} ${ui.path(result.registryPath)}`);
}

function printOperations(operations, registryPath, runInstructions = []) {
  if (operations.length === 0) {
    console.log(ui.warning("No matching profiles."));
    return;
  }

  for (const operation of operations) {
    console.log(`${formatAction(operation.action)}: ${ui.profile(operation.profile)} -> ${ui.command(operation.harness)} at ${ui.path(operation.target)}`);
  }
  if (registryPath) {
    console.log(`${ui.bold("Registry:")} ${ui.path(registryPath)}`);
  }
  printRunInstructions(runInstructions);
}

function printRunInstructions(runInstructions = []) {
  if (runInstructions.length === 0) {
    return;
  }

  console.log(ui.bold("Run installed profiles:"));
  for (const instruction of runInstructions) {
    console.log(`  ${ui.profile(instruction.profile)} via ${ui.command(instruction.harness)}: ${ui.command(instruction.command)}`);
    if (instruction.note) {
      console.log(`    ${instruction.note}`);
    }
  }
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function formatAction(action) {
  if (action.startsWith("would-")) {
    return ui.warning(action);
  }
  return ui.success(action);
}
