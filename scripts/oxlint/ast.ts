import type { ESTree } from "@oxlint/plugins";

// ESTree uses one Literal tag for several value types. The parser has already
// validated these nodes; this guard discriminates that typed union.
export function isStringLiteral(
  node: ESTree.Node | null | undefined,
): node is ESTree.StringLiteral {
  return node?.type === "Literal" && typeof node.value === "string";
}
