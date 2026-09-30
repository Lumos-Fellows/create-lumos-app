import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import * as Haptics from "expo-haptics";
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
} from "react-native";

type StaticTabsScreenOptions = Extract<
  NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>,
  { tabBarButton?: unknown }
>;
type HapticTabProps = Parameters<
  NonNullable<StaticTabsScreenOptions["tabBarButton"]>
>[0];

export function HapticTab({ ref, ...props }: HapticTabProps) {
  // SAFETY: React Navigation's ref also permits legacy ref values. This native
  // Pressable only supplies View instances or null, both accepted by that ref.
  const pressableRef = ref as ComponentProps<typeof Pressable>["ref"];

  return (
    <Pressable
      {...props}
      ref={pressableRef}
      onPressIn={(ev: GestureResponderEvent) => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
