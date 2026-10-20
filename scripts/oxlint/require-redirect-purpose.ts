import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { isStringLiteral } from "./ast.ts";

const redirectFunctions = new Set(["permanentRedirect", "redirect"]);
const namespaceImport = new Set(["*"]);
const nextResponseNames = new Set(["NextResponse"]);
const commentOwnerKinds = new Set([
  "ExpressionStatement",
  "ReturnStatement",
  "VariableDeclaration",
]);
const redirectPurpose = /\bREDIRECT-PURPOSE:\s+\S.{9,}/u;

function importedName(node: ESTree.Node): string | null {
  if (node.type === "ImportNamespaceSpecifier") return "*";
  if (node.type !== "ImportSpecifier") return null;
  return node.imported.type === "Identifier"
    ? node.imported.name
    : node.imported.value;
}

function isImportedBinding(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
  moduleName: string,
  names: ReadonlySet<string>,
) {
  let scope: ReturnType<SourceCode["getScope"]> | null =
    sourceCode.getScope(identifier);
  while (scope !== null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) {
      return variable.defs.some(
        (definition) =>
          definition.type === "ImportBinding" &&
          definition.parent?.type === "ImportDeclaration" &&
          definition.parent.source.value === moduleName &&
          names.has(importedName(definition.node) ?? ""),
      );
    }
    scope = scope.upper;
  }
  return false;
}

function memberName(expression: ESTree.Expression): string | null {
  if (!("property" in expression) || !("computed" in expression)) return null;
  if (expression.computed) {
    return isStringLiteral(expression.property)
      ? expression.property.value
      : null;
  }
  return expression.property.type === "Identifier"
    ? expression.property.name
    : null;
}

function isNextRedirect(sourceCode: SourceCode, callee: ESTree.Expression) {
  if (callee.type === "Identifier") {
    return isImportedBinding(
      sourceCode,
      callee,
      "next/navigation",
      redirectFunctions,
    );
  }
  if (!("object" in callee) || callee.object.type !== "Identifier") {
    return false;
  }
  if (
    redirectFunctions.has(memberName(callee) ?? "") &&
    isImportedBinding(
      sourceCode,
      callee.object,
      "next/navigation",
      namespaceImport,
    )
  )
    return true;
  return (
    memberName(callee) === "redirect" &&
    isImportedBinding(
      sourceCode,
      callee.object,
      "next/server",
      nextResponseNames,
    )
  );
}

function hasRedirectPurpose(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
) {
  let current: ESTree.Node = node;
  while (true) {
    if (
      sourceCode
        .getCommentsBefore(current)
        .some(
          (comment) =>
            comment.end <= node.start && redirectPurpose.test(comment.value),
        )
    ) {
      return true;
    }
    if (
      commentOwnerKinds.has(current.type) ||
      current.parent.type === "Program"
    ) {
      return false;
    }
    current = current.parent;
  }
}

/** Require each application redirect to document the durable product or security purpose it serves. */
export const requireRedirectPurposeRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require Next.js redirects to carry a nearby REDIRECT-PURPOSE override comment.",
    },
    messages: {
      missingPurpose:
        "Redirects require a nearby `REDIRECT-PURPOSE:` comment explaining why this navigation is necessary.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Super" ||
          node.callee.type === "V8IntrinsicExpression" ||
          !isNextRedirect(context.sourceCode, node.callee) ||
          hasRedirectPurpose(context.sourceCode, node)
        ) {
          return;
        }
        context.report({ node, messageId: "missingPurpose" });
      },
    };
  },
});
