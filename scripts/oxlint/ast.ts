import type { ESTree, SourceCode } from "@oxlint/plugins";

// ESTree uses one Literal tag for several value types. The parser has already
// validated these nodes; this guard discriminates that typed union.
export function isStringLiteral(
  node: ESTree.Node | null | undefined,
): node is ESTree.StringLiteral {
  return node?.type === "Literal" && typeof node.value === "string";
}

export function elementName(element: ESTree.JSXElement) {
  const { name } = element.openingElement;
  return name.type === "JSXIdentifier" ? name.name : null;
}

export function contentChildren(
  parent: ESTree.JSXElement | ESTree.JSXFragment,
) {
  return parent.children.filter((child) => {
    if (child.type === "JSXText") return child.value.trim().length > 0;
    return (
      child.type !== "JSXExpressionContainer" ||
      child.expression.type !== "JSXEmptyExpression"
    );
  });
}

export function hasPrecedingComment(
  sourceCode: SourceCode,
  parent: ESTree.JSXElement | ESTree.JSXFragment,
  node: ESTree.JSXElement,
  previous: ESTree.JSXChild | undefined,
  pattern: RegExp,
) {
  const boundary =
    previous?.end ??
    (parent.type === "JSXElement"
      ? parent.openingElement.end
      : parent.openingFragment.end);
  return sourceCode
    .getAllComments()
    .some(
      (comment) =>
        comment.start >= boundary &&
        comment.end <= node.start &&
        pattern.test(comment.value),
    );
}
