import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { contentChildren, elementName, hasPrecedingComment } from "./ast.ts";

const eyebrowComponentPattern =
  /(?:Eyebrow|Kicker|Overline|Preheading|SectionLabel)$/u;
const headingComponentPattern = /(?:Heading|Title)$/u;
const overridePattern = /\bEYEBROW_HEADING_OVERRIDE:\s*\S/u;

function isHeading(element: ESTree.JSXElement): boolean {
  const name = elementName(element);
  return (
    name !== null &&
    (/^h[1-6]$/u.test(name) || headingComponentPattern.test(name))
  );
}

function hasEyebrowClasses(
  sourceCode: SourceCode,
  element: ESTree.JSXElement,
): boolean {
  const classNameAttribute = element.openingElement.attributes.find(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === "className",
  );
  if (classNameAttribute === undefined) return false;

  const classNameSource = sourceCode.getText(classNameAttribute);
  return (
    /(?:^|[\s"'`}])uppercase(?:\s|["'`}])/u.test(classNameSource) &&
    /(?:^|[\s"'`}])tracking-(?:\[[^\]]+\]|wide|wider|widest)(?:\s|["'`}])/u.test(
      classNameSource,
    )
  );
}

function isEyebrow(
  sourceCode: SourceCode,
  element: ESTree.JSXElement,
): boolean {
  const name = elementName(element);
  return (
    (name !== null && eyebrowComponentPattern.test(name)) ||
    hasEyebrowClasses(sourceCode, element)
  );
}

function checkChildren(
  sourceCode: SourceCode,
  parent: ESTree.JSXElement | ESTree.JSXFragment,
  report: (node: ESTree.JSXElement) => void,
) {
  const children = contentChildren(parent);

  for (let index = 0; index < children.length - 1; index += 1) {
    const eyebrow = children[index];
    const heading = children[index + 1];
    if (
      eyebrow.type !== "JSXElement" ||
      heading.type !== "JSXElement" ||
      !isEyebrow(sourceCode, eyebrow) ||
      !isHeading(heading)
    ) {
      continue;
    }

    if (
      !hasPrecedingComment(
        sourceCode,
        parent,
        eyebrow,
        children[index - 1],
        overridePattern,
      )
    )
      report(eyebrow);
  }
}

/** Reject ornamental eyebrow copy immediately before a heading. */
export const noEyebrowBeforeHeadingRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prevent small uppercase eyebrow labels from appearing immediately before headings without a documented reason.",
    },
    messages: {
      noEyebrowBeforeHeading:
        "Remove this eyebrow label and let the heading lead. If the extra label is essential, add an immediately preceding `EYEBROW_HEADING_OVERRIDE:` comment that explains why.",
    },
  },
  createOnce(context) {
    const report = (node: ESTree.JSXElement) =>
      context.report({ node, messageId: "noEyebrowBeforeHeading" });

    return {
      "JSXElement:exit": (node) =>
        checkChildren(context.sourceCode, node, report),
      "JSXFragment:exit": (node) =>
        checkChildren(context.sourceCode, node, report),
    };
  },
});
