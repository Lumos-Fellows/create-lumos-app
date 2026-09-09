import { defineRule, type ESTree } from "@oxlint/plugins";
import { isStringLiteral } from "./ast.ts";

function isSpinner(node: ESTree.Node) {
  return (
    node.type === "JSXElement" &&
    node.openingElement.name.type === "JSXIdentifier" &&
    /^(Spinner|Loader2|LoaderCircle)$/u.test(node.openingElement.name.name)
  );
}

function hasLabel(node: ESTree.Node, excluded?: ESTree.Node): boolean {
  if (node === excluded || isSpinner(node)) return false;
  if (node.type === "JSXText") return node.value.trim().length > 0;
  if (node.type === "Literal")
    return isStringLiteral(node) && node.value.trim().length > 0;
  if (node.type === "JSXEmptyExpression") return false;
  if (node.type === "JSXExpressionContainer")
    return hasLabel(node.expression, excluded);
  if (node.type === "JSXElement" || node.type === "JSXFragment")
    return node.children.some((child) => hasLabel(child, excluded));
  if (node.type === "ConditionalExpression")
    return (
      hasLabel(node.consequent, excluded) && hasLabel(node.alternate, excluded)
    );
  // An optional child cannot provide a persistent action label.
  if (node.type === "LogicalExpression" && node.operator === "&&") return false;
  // Dynamic labels cannot be proven empty statically.
  return true;
}

export const noSpinnerOnlyButtonRule = defineRule({
  meta: {
    type: "problem",
    messages: {
      missingLabel:
        "Keep the action label visible beside the pending spinner. Use aria-busy to expose the pending state.",
    },
  },
  createOnce(context) {
    return {
      ConditionalExpression(node) {
        if (
          !(
            (isSpinner(node.consequent) && hasLabel(node.alternate)) ||
            (isSpinner(node.alternate) && hasLabel(node.consequent))
          )
        )
          return;
        let parent = node.parent;
        while (parent.type !== "Program") {
          if (
            parent.type === "JSXElement" &&
            parent.openingElement.name.type === "JSXIdentifier" &&
            /^(button|Button)$/u.test(parent.openingElement.name.name)
          ) {
            if (!hasLabel(parent, node))
              context.report({ node, messageId: "missingLabel" });
            return;
          }
          parent = parent.parent;
        }
      },
    };
  },
});
