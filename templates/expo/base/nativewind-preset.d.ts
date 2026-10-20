declare module "nativewind/preset" {
  const preset: (() => import("tailwindcss").Config) & { nativewind: true };
  export default preset;
}
