import { eslintCompatPlugin } from "@oxlint/plugins";
import { noServiceConstructorImportsRule } from "./rules/no-service-constructor-imports.mjs";
const antiSlopEffectPlugin = eslintCompatPlugin({
    meta: {
        name: "anti-slop-effect"
    },
    rules: {
        "no-service-constructor-imports": noServiceConstructorImportsRule
    }
});
export default antiSlopEffectPlugin;
