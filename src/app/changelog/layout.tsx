import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
          KiraPoket
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
