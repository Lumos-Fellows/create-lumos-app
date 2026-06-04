import { PlatformPressable } from "@react-navigation/elements";
import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import * as Haptics from "expo-haptics";
import { Platform, type GestureResponderEvent } from "react-native";

type StaticTabsScreenOptions = Extract<
  NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>,
  { tabBarButton?: unknown }
>;
type HapticTabProps = Parameters<
  NonNullable<StaticTabsScreenOptions["tabBarButton"]>
>[0];
type PlatformPressableProps = ComponentProps<typeof PlatformPressable>;

export function HapticTab(props: HapticTabProps) {
  return (
    <PlatformPressable
      {...(props as PlatformPressableProps)}
      onPressIn={(ev: GestureResponderEvent) => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
