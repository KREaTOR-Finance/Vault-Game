import type { ReactNode } from "react";
import ConsoleFrame from "@/components/console/ConsoleFrame";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <ConsoleFrame>{children}</ConsoleFrame>;
}
