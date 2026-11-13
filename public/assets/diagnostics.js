(function (root) {
  "use strict";

  const MAX_LENGTH = 250000;
  const MAX_FINDINGS = 5;

  function importIssue(match) {
    const specifier = match[1];
    const importer = match[2];
    if (/^(?:\.{1,2}\/|\/|~\/|@\/|#)/.test(specifier)) {
      const relative = /^\.{1,2}\//.test(specifier);
      return {
        title: "Local import could not be resolved",
        explanation: "The build could not locate " + specifier + (importer ? " from " + importer : "") + ".",
        steps: [
          {
            title: "Find the import",
            text: importer
              ? "Open " + importer + " and find the import for " + specifier + "."
              : "Find " + specifier + " in the project. Start with the importing file or directory listed near the error."
          },
          {
            title: "Check the path and filename",
            text: relative
              ? "Resolve the path from the importing file’s folder. Compare each folder name, the extension, and the capitalization. For example, if the file is src/navbar.jsx and App.jsx is beside it, import './navbar.jsx'. A Windows build can miss a casing mismatch that fails on a case-sensitive Linux host."
              : "Check what the prefix resolves to in your bundler or framework and confirm the resulting file exists. For TypeScript projects, compare tsconfig.json paths with the bundler’s alias settings."
          },
          {
            title: "Check which files are tracked",
            text: "Run these from the repository root. In the tracked files, check the spelling of the target path. If the file only exists locally, add it to Git and check ignore rules if it is missing from status.",
            code: "git status --short\ngit ls-files"
          },
          {
            title: "Fix a case-only rename if needed",
            text: "To keep the name already on disk, update the import. To change the tracked filename’s capitalization on Windows, use a temporary name first. These example commands assume Git tracks src/navbar.jsx and you want src/Navbar.jsx.",
            code: "git mv src/navbar.jsx src/Navbar-temp.jsx\ngit mv src/Navbar-temp.jsx src/Navbar.jsx"
          },
          {
            title: "Check the app root and generated files",
            text: "If the path and casing match, check that the deploy is building the expected app folder and commit. If the imported file is generated, make sure its generation step runs before the build."
          }
        ],
        verify: "Run the production build from a clean checkout of the fixed commit. Push it and confirm the new deployment builds that commit."
      };
    }

    return {
      title: "Package import could not be resolved",
      explanation: "The build could not resolve " + specifier + ". The app workspace may be missing the package, or the imported entry point may be unavailable.",
      steps: [
        { title: "Identify the package", text: "Check the spelling and the part before any internal path. For a scoped import such as @scope/library/widget, the package name is @scope/library." },
        { title: "Check the app’s package.json", text: "Look in the workspace that imports the package. For npm projects, list the top-level dependencies from that workspace.", code: "npm ls --depth=0" },
        { title: "Install a missing dependency", text: "If the package is absent, add it using the project’s package manager. For example, run this if axios is the missing package and the project uses npm. Commit the manifest and lockfile.", code: "npm install axios" },
        { title: "Check the import path for the installed version", text: "If the dependency is already installed, check that its version exposes the imported path. Update the import to a documented entry point or use a compatible package version." }
      ],
      verify: "Run a clean install from the committed lockfile, then run the host’s production build command."
    };
  }

  const rules = [
    {
      id: "peer-dependency",
      pattern: /\bERESOLVE\b.*(?:unable|could not|dependency|resolve)|\bcould not resolve dependency:|\bconflicting peer dependency:/i,
      title: "Conflicting package versions",
      explanation: "npm could not satisfy the package versions requested by your dependencies.",
      steps: [
        { title: "Read the conflicting versions", text: "Find the Found, Could not resolve dependency, and peer lines. Write down the installed version and the range that the dependent package accepts." },
        { title: "Choose compatible versions", text: "Check whether a newer version of the dependent package supports the version you already use. If it doesn’t, select a supported version of the shared dependency or replace the dependent package." },
        { title: "Update the lockfile", text: "Install the chosen versions with your package manager and review the package.json and lockfile changes together." }
      ],
      verify: "For an npm project, run npm ci and then npm run build from a clean checkout with the updated lockfile."
    },
    {
      id: "lockfile",
      pattern: /\bERR_PNPM_OUTDATED_LOCKFILE\b|\bYN0028\b|\b(?:can only install packages when|make sure).{0,80}\b(?:package\.json|lockfile)\b.{0,130}\bin sync\b|\blockfile\b.{0,130}\b(?:out of sync|would have been modified)\b|\bfrozen-lockfile\b.{0,120}\b(?:not up to date|not present)\b/i,
      title: "Lockfile needs an update",
      explanation: "The install failed because it would change the lockfile or the expected lockfile is missing.",
      steps: [
        { title: "Check the package manager", text: "Match the package manager and version used by CI. Confirm that the selected deployment root has access to the project’s intended lockfile." },
        { title: "Regenerate using the project’s package manager", text: "Install from the workspace root using the normal local install command, such as npm install for an npm project. Review why the manifest and lockfile changed." },
        { title: "Commit both files", text: "Commit the manifest and the updated lockfile together, then deploy the commit containing both." }
      ],
      verify: "Run the same frozen install used by CI. For npm projects, npm ci checks that package.json and the lockfile agree."
    },
    {
      id: "runtime-version",
      pattern: /\b(?:EBADENGINE|Unsupported engine)\b|\b(?:requires?|unsupported|invalid)\b.{0,55}\bNode\.?js version\b|\bNode\.?js version\b.{0,75}\b(?:is unsupported|is not supported|is required|is required to)\b/i,
      title: "Node.js version may be incompatible",
      explanation: "The log reports a Node.js or package engine requirement. Check the accompanying required and current versions.",
      steps: [
        { title: "Compare local and deployed versions", text: "Check the versions printed in the deployment log and compare them with the versions in your terminal.", code: "node --version\nnpm --version" },
        { title: "Find the required version", text: "Read the package’s Required and Current lines. Check package.json engines and any version file your repository uses." },
        { title: "Align the project and host", text: "Choose a supported Node.js version that meets the project and dependency requirements. Update the host’s Node.js version and any project-level pin as needed." }
      ],
      verify: "Run a clean install and production build with the chosen runtime. Check that the next deployment reports the expected version."
    },
    {
      id: "missing-script",
      pattern: /\bMissing script:\s*["']?([\w:.-]+)|\bCouldn't find a script named\s+["']([\w:.-]+)["']/i,
      title: "Build script is missing",
      explanation: (match) => "The log points to a missing script named " + (match[1] || match[2]) + ".",
      steps: [
        { title: "Check the project root", text: "Open the package.json in the directory selected by your host. In a repository with an apps/web folder, check whether that folder owns the web app’s scripts." },
        { title: "List the scripts that exist", text: "For an npm project, run this from the app’s directory and compare the list with the host’s Build Command.", code: "npm run" },
        { title: "Add the appropriate script or correct the host command", text: "Use the script your project defines. If a Vite project is missing its production script, an example entry under scripts is \"build\": \"vite build\"." }
      ],
      verify: "Run the exact deployment build command from the configured root. Confirm it succeeds before redeploying."
    },
    {
      id: "output-directory",
      pattern: /\bNo Output Directory named\b|\bMissing public directory\b|\b(?:specified|configured) output directory\b.*\b(?:does not exist|was not found|is missing)\b/i,
      title: "Deployment output directory is missing",
      explanation: "The host could not find the directory it was configured to publish after the build.",
      steps: [
        { title: "Find the real output folder", text: "Run the same build locally and read the last successful output. For a Vite project, dist is the usual default and build.outDir can change it." },
        { title: "Check the deployment root", text: "Confirm that the output folder is relative to the app directory selected by the host. Compare the repository configuration with the project’s dashboard overrides." },
        { title: "Correct the output setting", text: "Use the folder created by the build, or clear an unnecessary override to use the framework preset. For a static site without a build, set the output to the directory containing index.html." }
      ],
      verify: "Run a fresh build and confirm the selected directory contains the expected output before redeploying."
    },
    {
      id: "environment-variable",
      pattern: /\bMissing (?:required )?environment variable(?:s)?\s*:?\s+.+|\benvironment variable\b.{0,140}\b(?:is (?:missing|required|not set|undefined)|must be set)\b/i,
      title: "A required environment variable is missing",
      explanation: "The build explicitly reports that it needs an environment variable that was unavailable.",
      steps: [
        { title: "Check the variable name", text: "Compare the exact spelling in the error with the code and any example environment file. Check whether the variable is needed during the build or at runtime." },
        { title: "Set it in the affected environment", text: "Open your hosting project’s environment settings and add the required value to Preview or Production as appropriate. A local .env file can explain why the build works on your machine." },
        { title: "Keep server secrets server-side", text: "Put secret values in server-side environment settings. Reserve frontend-exposed prefixes such as VITE_ and NEXT_PUBLIC_ for values that can be public." }
      ],
      verify: "Create a new deployment for the affected environment and confirm the missing-variable error is gone."
    },
    {
      id: "typescript",
      pattern: /\berror TS\d{4,5}:|\bType error:\s+\S/i,
      title: "TypeScript check failed",
      explanation: "A TypeScript error stopped the build. The compiler message describes the type or value it expected.",
      steps: [
        { title: "Go to the reported file and line", text: "Compare the expected type and the actual value. Look for the TypeScript error code, prop name, or function signature in the surrounding lines." },
        { title: "Fix the mismatch at its source", text: "Align the data or prop with the declared type. If the value can be missing, handle that case before accessing it or narrow its type after validation." },
        { title: "Run the project’s type check", text: "Use the project’s type-check script. For a single TypeScript app with a local compiler and a suitable tsconfig, this npm example checks types without emitting files.", code: "npx tsc --noEmit" }
      ],
      verify: "Confirm the type check passes, then run the production build to catch any separate bundler errors."
    },
    {
      id: "missing-export",
      pattern: /\bis not exported by\b|\bdoes not provide an export named\b|\bexport ['"][^'"]{1,100}['"] (?:was not found|is not exported)\b|\bERR_PACKAGE_PATH_NOT_EXPORTED\b/i,
      title: "Imported export is unavailable",
      explanation: "The module was found, but the requested export or package entry point is unavailable.",
      steps: [
        { title: "Compare the import and export", text: "Check whether the source uses a named export or a default export. A named export uses braces in the import, while a default export is imported without braces." },
        { title: "Check re-exports and package entry points", text: "If you import through an index file, make sure it re-exports the symbol. For a dependency, check the public exports for your installed version." },
        { title: "Update the importing file", text: "Correct the symbol or entry path, and update any other imports that rely on the same removed export." }
      ],
      verify: "Run the production build and confirm the reported import is resolved without an export error."
    },
    {
      id: "unresolved-import",
      pattern: /\b(?:Can't resolve|Cannot resolve|Could not resolve|failed to resolve import|Could not load|Cannot find (?:module|package)|Failed to resolve module specifier)\s+['"]([^'"\r\n]{1,260})['"](?:\s+(?:from|imported by)\s+['"]([^'"\r\n]{1,260})['"])?/i,
      make: importIssue
    },
    {
      id: "command-not-found",
      pattern: /(?:\b[\w./@-]+:\s*(?:command )?not found\b|\bis not recognized as an internal or external command\b|\bERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL\b|\bcould not determine executable to run\b)/i,
      title: "Build executable could not start",
      explanation: "The shell or package runner could not locate the program required by the build command.",
      steps: [
        { title: "Find the missing program", text: "Read the line before or after the error and compare the missing executable with the exact script in package.json." },
        { title: "Declare the tool in the correct workspace", text: "If the command works locally because the tool is globally installed, add it as a project dependency of the workspace that runs it." },
        { title: "Review the deployment install", text: "Check that the host runs the install in the right directory and includes any development dependencies required by the build." }
      ],
      verify: "Install dependencies in a clean checkout and run the deployment build command from the configured root."
    },
    {
      id: "memory",
      pattern: /\bJavaScript heap out of memory\b|\bReached heap limit\b|\bAllocation failed - process out of memory\b|\bFATAL ERROR:\s*Ineffective mark-compacts near heap limit\b/i,
      title: "Build ran out of JavaScript heap memory",
      explanation: "Node.js ran out of heap memory while running a build step.",
      steps: [
        { title: "Identify the build stage", text: "Check which tool was running immediately before the memory error. Look for unusual source maps, unusually large assets, or plugin work in that stage." },
        { title: "Reduce peak memory", text: "Try smaller input assets, remove generated data that is bundled by mistake, or split the failing stage. Change one setting at a time and compare the result." },
        { title: "Check the host’s memory budget", text: "If the build legitimately needs more memory, check the host’s build resources before adjusting Node’s heap limit. Leave memory for the operating system and other build processes." }
      ],
      verify: "Run a production build under the intended host limits and confirm it completes consistently."
    },
    {
      id: "syntax-error",
      pattern: /\b(?:SyntaxError:|Unexpected token\b|Parsing error:)\s*\S/i,
      title: "Source code could not be parsed",
      explanation: "The compiler or parser stopped at code it could not read.",
      steps: [
        { title: "Read the lines around the error", text: "Open the reported file and check the indicated line and the preceding few lines for an unmatched quote, bracket, or JSX tag." },
        { title: "Check the parser and file extension", text: "If the syntax is valid for the language you intended to use, confirm that the build configuration handles that extension. JSX or TSX can require a matching file extension and transformer." },
        { title: "Inspect any generated input", text: "If the error points into a generated file or JSON response, inspect the input to the failing step and fix the generator or source data." }
      ],
      verify: "Run the project’s production build again and confirm the parser passes the reported file."
    }
  ];

  const sampleLogs = {
    import: [
      'Running "vercel build"',
      'Running "npm run build"',
      "vite building for production...",
      "✓ 38 modules transformed.",
      "✗ Build failed",
      'Could not resolve "./Navbar.jsx" from "src/App.jsx"',
      'Error: Command "npm run build" exited with 1'
    ].join("\n"),
    dependency: [
      'Running "npm run build"',
      "Creating an optimized production build...",
      "Failed to compile.",
      "Module not found: Error: Can't resolve 'axios' in '/vercel/path0/src'",
      'Error: Command "npm run build" exited with 1'
    ].join("\n"),
    command: [
      'Running "vercel build"',
      'Running "npm run build"',
      'npm error Missing script: "build"',
      'npm error To see a list of scripts, run: npm run',
      'Error: Command "npm run build" exited with 1'
    ].join("\n"),
    lockfile: [
      "Running pnpm install --frozen-lockfile",
      "ERR_PNPM_OUTDATED_LOCKFILE Cannot install with frozen-lockfile because pnpm-lock.yaml is not up to date with package.json"
    ].join("\n"),
    environment: [
      'Running "npm run build"',
      "Collecting page data",
      "Error: Missing required environment variable: DATABASE_URL",
      'Error: Command "npm run build" exited with 1'
    ].join("\n"),
    multiple: [
      'Running "npm run build"',
      "src/App.tsx(18,7): error TS2322: Type 'string' is not assignable to type 'number'.",
      "src/Settings.tsx(12,3): error TS2322: Type 'string' is not assignable to type 'number'.",
      '"NavLink" is not exported by "src/components/Nav.jsx", imported by "src/App.jsx".',
      'Error: Command "npm run build" exited with 1'
    ].join("\n")
  };

  const genericFailure = /(?:\b(?:fatal|error)(?:[:! ]|\[[^\]]+\])|\bfailed\b|\bexited with (?:code )?[1-9]\d*\b)/i;
  const wrapperFailure = /^(?:[✗×]\s*)?(?:build failed\b|failed to compile\.?$|command .{1,400} exited with (?:code )?\d+\b|during build:?$)/i;
  const ansiSequence = /\x1B(?:\][^\x07\x1B]*(?:\x07|\x1B\\)|\[[0-?]*[ -/]*[@-~])/g;
  const timePrefix = /^(?:\[(?:\d{4}-\d{2}-\d{2}[ T])?\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?\]|\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?)\s+/;

  function analyzeLog(input) {
    if (typeof input !== "string" || !input.trim()) return { state: "empty" };
    if (input.length > MAX_LENGTH) return { state: "too-long" };

    const lines = input.split(/\r\n|\n|\r/);
    const matches = new Map();
    let fallback;

    for (const [index, line] of lines.entries()) {
      const excerpt = line.replace(ansiSequence, "").trim();
      const content = excerpt.replace(timePrefix, "");
      if (!content) continue;

      const evidence = { line: index + 1, text: excerpt.length > 600 ? excerpt.slice(0, 599) + "…" : excerpt };
      const normalized = content.replace(/^(?:(?:npm\s+)?(?:error|fatal)[:!]?\s+)+/i, "");
      const wrapper = wrapperFailure.test(normalized);

      if (genericFailure.test(content) && (!fallback || fallback.wrapper)) {
        fallback = { evidence, wrapper };
      }

      if (wrapper || /^Running ["']/i.test(normalized) || /^(?:(?:npm|pnpm|yarn)\s+)?warn(?:ing)?[\s:]/i.test(content)) continue;
      for (const rule of rules) {
        const match = rule.pattern.exec(content);
        if (!match) continue;
        const target = rule.id === "unresolved-import" ? match[1] : "";
        const key = rule.id + ":" + target;
        let group = matches.get(key);
        if (!group) {
          group = { rule, match, evidence, related: [] };
          matches.set(key, group);
        } else if (group.related.length < 2 && group.evidence.text !== evidence.text &&
                   !group.related.some((item) => item.text === evidence.text)) {
          group.related.push(evidence);
        }
        break;
      }
    }

    const findings = Array.from(matches.values()).slice(0, MAX_FINDINGS).map(({ rule, match, evidence, related }) => {
      const details = rule.make ? rule.make(match) : {
        title: rule.title,
        explanation: typeof rule.explanation === "function" ? rule.explanation(match) : rule.explanation,
        steps: rule.steps,
        verify: rule.verify
      };
      return {
        id: rule.id,
        evidence,
        related,
        ...details
      };
    });

    if (findings.length) {
      return { state: "matched", ...findings[0], additional: findings.slice(1), omitted: matches.size - findings.length };
    }

    return {
      state: "unknown",
      evidence: fallback?.evidence,
      title: "No supported error matched",
      explanation: "A generic failure message often appears after the actual error. A complete log gives the checker more context.",
      steps: [
        { title: "Find the failing stage", text: "Identify whether installation, compilation, tests, or artifact upload failed. Copy the lines from the start of that stage through the first error." },
        { title: "Look for specific clues", text: "Find the first line that names a file, dependency, setting, or error code. If the host shows only an exit code, expand the raw build output and look above it." },
        { title: "Reproduce using the deployment settings", text: "Use the same commit, project directory, runtime version, and package manager. Run the install and build commands separately to isolate the failure." }
      ],
      verify: "Check the fuller log again once you have the first specific error."
    };
  }

  const api = { analyzeLog, sampleLogs, MAX_LENGTH };
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.BuildClinic = api;
  }
})(globalThis);
