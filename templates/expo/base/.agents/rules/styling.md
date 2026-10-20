# Styling

Use NativeWind `className` for all styling — never `StyleSheet.create()` or inline `style` objects. The only exception is React Navigation's `screenOptions` API (e.g. `tabBarStyle`) which requires plain style objects since it doesn't support `className`.

Use design tokens from `global.css` (e.g. `text-foreground`, `bg-background`, `text-muted-foreground`) rather than hardcoded colors.
