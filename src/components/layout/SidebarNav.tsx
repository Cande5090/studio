
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shirt, Sparkles, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/dashboard/wardrobe", label: "Mi Armario", icon: Shirt },
  { href: "/dashboard/outfits", label: "Mis Atuendos", icon: Users }, // Users icon as placeholder for multiple items
  { href: "/dashboard/suggestions", label: "Sugerencias IA", icon: Sparkles },
  { href: "/dashboard/profile", label: "Perfil", icon: Settings },
];

export function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn(
      "flex flex-col gap-2 text-sm font-medium",
      mobile ? "p-4" : "px-2 lg:px-4"
    )}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
            mobile && "text-lg py-3"
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
