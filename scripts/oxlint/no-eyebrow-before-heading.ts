import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const eyebrowComponentPattern =
  /(?:Eyebrow|Kicker|Overline|Preheading|SectionLabel)$/u;
const headingComponentPattern = /(?:Heading|Title)$/u;
const overridePattern = /\bEYEBROW_HEADING_OVERRIDE:\s*\S/u;

function elementName(element: ESTree.JSXElement): string | null {
  const { name } = element.openingElement;
  return name.type === "JSXIdentifier" ? name.name : null;
}

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

function isContentChild(child: ESTree.JSXChild): boolean {
  if (child.type === "JSXText") return child.value.trim().length > 0;
  if (child.type === "JSXExpressionContainer") {
    return child.expression.type !== "JSXEmptyExpression";
  }
  return true;
}

function hasOverride(
  sourceCode: SourceCode,
  eyebrow: ESTree.JSXElement,
  boundary: number,
): boolean {
  return sourceCode
    .getAllComments()
    .some(
      (comment) =>
        comment.start >= boundary &&
        comment.end <= eyebrow.start &&
        overridePattern.test(comment.value),
    );
}

function checkChildren(
  sourceCode: SourceCode,
  parent: ESTree.JSXElement | ESTree.JSXFragment,
  report: (node: ESTree.JSXElement) => void,
) {
  const contentChildren = parent.children.filter(isContentChild);

  for (let index = 0; index < contentChildren.length - 1; index += 1) {
    const eyebrow = contentChildren[index];
    const heading = contentChildren[index + 1];
    if (
      eyebrow.type !== "JSXElement" ||
      heading.type !== "JSXElement" ||
      !isEyebrow(sourceCode, eyebrow) ||
      !isHeading(heading)
    ) {
      continue;
    }

    const previousContent = contentChildren[index - 1];
    const boundary =
      previousContent?.end ??
      (parent.type === "JSXElement"
        ? parent.openingElement.end
        : parent.openingFragment.end);
    if (!hasOverride(sourceCode, eyebrow, boundary)) report(eyebrow);
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
