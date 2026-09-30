import { eslintCompatPlugin } from "@oxlint/plugins";
import { noEyebrowBeforeHeadingRule } from "./no-eyebrow-before-heading.ts";
import { noHeadingDescriptionRule } from "./no-heading-description.ts";
import { noPlaceholderEllipsisRule } from "./no-placeholder-ellipsis.ts";
import { noRouteAdjacentHelpersRule } from "./no-route-adjacent-helpers.ts";
import { noSpinnerOnlyButtonRule } from "./no-spinner-only-button.ts";
import { requireRedirectPurposeRule } from "./require-redirect-purpose.ts";

export default eslintCompatPlugin({
  meta: { name: "app-quality" },
  rules: {
    "no-eyebrow-before-heading": noEyebrowBeforeHeadingRule,
    "no-heading-description": noHeadingDescriptionRule,
    "no-route-adjacent-helpers": noRouteAdjacentHelpersRule,
    "require-redirect-purpose": requireRedirectPurposeRule,
    "no-spinner-only-button": noSpinnerOnlyButtonRule,
    "no-placeholder-ellipsis": noPlaceholderEllipsisRule,
  },
});
