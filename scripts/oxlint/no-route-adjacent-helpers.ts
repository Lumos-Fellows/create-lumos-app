import { readdirSync } from "node:fs";
import { basename, dirname } from "node:path";
import { defineRule } from "@oxlint/plugins";

const sourceExtension = /\.[cm]?[jt]sx?$/u;
const routeEntry = /^(?:page|route)\.[jt]sx?$/u;
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const frameworkFile =
  /^(?:page|route|layout|template|loading|error|global-error|not-found|global-not-found|default|forbidden|unauthorized|sitemap|robots|manifest|(?:icon|apple-icon|opengraph-image|twitter-image)\d?)\.[jt]sx?$/u;

/** Keep business rules and ordinary components out of route entry folders. */
export const noRouteAdjacentHelpersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow ordinary source files beside an App Router page or route entry.",
    },
    messages: {
      moveHelper:
        "Move this helper out of the page/route folder. Put business logic, server actions, and types in the owning src/lib domain; put UI components in _components or src/components. Next.js special files and colocated tests may stay.",
    },
  },
  create(context) {
    const normalized = context.filename.replaceAll("\\", "/");
    const appPath = normalized.split("/src/app/")[1];
    if (
      !appPath ||
      appPath
        .split("/")
        .slice(0, -1)
        .some((part) => part.startsWith("_"))
    ) {
      return {};
    }
    const name = basename(context.filename);
    if (
      !sourceExtension.test(name) ||
      frameworkFile.test(name) ||
      testFile.test(name)
    ) {
      return {};
    }
    // Read siblings per file: adding a page during a watch session must also
    // make existing helper files in that folder start failing the rule.
    if (
      !readdirSync(dirname(context.filename)).some((sibling) =>
        routeEntry.test(sibling),
      )
    ) {
      return {};
    }
    return {
      Program(node) {
        context.report({ node, messageId: "moveHelper" });
      },
    };
  },
});
