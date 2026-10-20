import { defineRule } from "@oxlint/plugins";
import { isStringLiteral } from "./ast.ts";

export const noPlaceholderEllipsisRule = defineRule({
  meta: {
    type: "suggestion",
    messages: {
      ellipsis:
        "Use a direct example or instruction without a trailing ellipsis.",
    },
  },
  createOnce(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "placeholder"
        )
          return;
        const value =
          node.value?.type === "JSXExpressionContainer"
            ? node.value.expression
            : node.value;
        if (isStringLiteral(value) && /(?:\.\.\.|…)\s*$/u.test(value.value)) {
          context.report({ node, messageId: "ellipsis" });
        }
      },
    };
  },
});
