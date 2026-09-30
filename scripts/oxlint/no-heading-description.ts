import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { isStringLiteral } from "./ast.ts";

const headingOverride = /\bHEADING-DESCRIPTION:\s+\S.{9,}/u;
const nativeHeading = /^h[1-6]$/u;

function elementName(node: ESTree.JSXElement) {
  return node.openingElement.name.type === "JSXIdentifier"
    ? node.openingElement.name.name
    : null;
}

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

function isLayoutWhitespace(node: ESTree.JSXChild) {
  return (
    (node.type === "JSXText" && node.value.trim() === "") ||
    (node.type === "JSXExpressionContainer" &&
      node.expression.type === "JSXEmptyExpression")
  );
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

function hasHeadingOverride(
  sourceCode: SourceCode,
  container: ESTree.JSXElement | ESTree.JSXFragment,
  headingIndex: number,
  heading: ESTree.JSXElement,
) {
  const previousContent = container.children
    .slice(0, headingIndex)
    .reverse()
    .find((child) => !isLayoutWhitespace(child));
  const commentRegionStart =
    previousContent?.end ??
    (container.type === "JSXElement"
      ? container.openingElement.end
      : container.openingFragment.end);
  return sourceCode
    .getAllComments()
    .some(
      (comment) =>
        comment.start >= commentRegionStart &&
        comment.end <= heading.start &&
        headingOverride.test(comment.value),
    );
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
      for (let index = 0; index < node.children.length; index += 1) {
        const heading = node.children[index];
        if (heading.type !== "JSXElement") continue;
        const headingName = elementName(heading);
        if (
          headingName === null ||
          (!nativeHeading.test(headingName) && headingName !== "CardTitle") ||
          hasHeadingOverride(context.sourceCode, node, index, heading)
        ) {
          continue;
        }

        const description = node.children
          .slice(index + 1)
          .find((child) => !isLayoutWhitespace(child));
        if (isDescriptionForHeading(headingName, description)) {
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
