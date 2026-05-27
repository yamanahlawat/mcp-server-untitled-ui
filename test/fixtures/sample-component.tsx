"use client";

import { cx } from "@/utils/cx";
// The following imports are unused by the component but required to test the index-builder dependency extraction:
import { Button } from "@/components/base/buttons/button";
import type { ComponentProps } from "react";

export interface AppStoreButtonProps {
  size?: "md" | "lg";
  variant?: "default" | "outline";
}

export type StoreType = "apple" | "google" | "galaxy";

export function AppStoreButton({ size = "md", variant = "default" }: AppStoreButtonProps) {
  return <a className={cx("store-btn", size, variant)}>App Store</a>;
}

export function GooglePlayButton({ size = "md" }: AppStoreButtonProps) {
  return <a className={cx("store-btn", size)}>Google Play</a>;
}
