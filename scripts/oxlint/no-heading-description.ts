import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import {
  contentChildren,
  elementName,
  hasPrecedingComment,
  isStringLiteral,
} from "./ast.ts";

const headingOverride = /\bHEADING-DESCRIPTION:\s+\S.{9,}/u;
const nativeHeading = /^h[1-6]$/u;

function hasStaticClass(node: ESTree.JSXElement, className: string) {
  const classAttribute = node.openingElement.attributes.find(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === "className",
  );
  if (
    classAttribute?.type !== "JSXAttribute" ||
    !isStringLiteral(classAttribute.value)
  ) {
    return false;
  }
  return classAttribute.value.value.split(/\s+/u).includes(className);
}

function hasRuntimeContent(
  node: ESTree.JSXElement | ESTree.JSXFragment,
): boolean {
  return node.children.some((child) => {
    if (child.type === "JSXElement" || child.type === "JSXFragment")
      return hasRuntimeContent(child);
    return (
      child.type === "JSXExpressionContainer" &&
      child.expression.type !== "JSXEmptyExpression"
    );
  });
}

function isDescriptionForHeading(
  headingName: string,
  description: ESTree.JSXChild | undefined,
) {
  if (description?.type !== "JSXElement") return false;
  const descriptionName = elementName(description);
  return nativeHeading.test(headingName)
    ? descriptionName === "p" &&
        hasStaticClass(description, "text-muted-foreground") &&
        (hasStaticClass(description, "text-sm") ||
          hasStaticClass(description, "text-xs")) &&
        !hasRuntimeContent(description)
    : headingName === "CardTitle" && descriptionName === "CardDescription";
}

/** Prevent heading-and-description pairs from repeating what a page already makes clear. */
export const noHeadingDescriptionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent app surfaces from pairing a heading with an extra descriptive line.",
    },
    messages: {
      redundantHeadingDescription:
        "Remove this extra heading description. If the description provides essential context, add a `HEADING-DESCRIPTION:` JSX comment that explains why it is necessary.",
    },
  },
  create(context) {
    function check(node: ESTree.JSXElement | ESTree.JSXFragment) {
      const children = contentChildren(node);
      for (let index = 0; index < children.length - 1; index += 1) {
        const heading = children[index];
        if (heading.type !== "JSXElement") continue;
        const headingName = elementName(heading);
        if (
          headingName === null ||
          (!nativeHeading.test(headingName) && headingName !== "CardTitle") ||
          hasPrecedingComment(
            context.sourceCode,
            node,
            heading,
            children[index - 1],
            headingOverride,
          )
        ) {
          continue;
        }

        if (isDescriptionForHeading(headingName, children[index + 1])) {
          context.report({
            node: heading,
            messageId: "redundantHeadingDescription",
          });
        }
      }
    }
    return { JSXElement: check, JSXFragment: check };
  },
});
