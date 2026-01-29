"use client";
import { cn } from "@/lib/utils";
import { Home, Mail, Users, Settings, Brain, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navigation = [
    { name: "Início", href: "/home", icon: Home, isActive: pathname.startsWith("/home") },
    {
      name: "Gestantes",
      href: "/patients",
      icon: Users,
      isActive: pathname.startsWith("/patients"),
    },
    // { name: "AI", href: "/ai", icon: BrainCircuit, isActive: pathname.startsWith("/ai") },
    { name: "Convites", href: "/invites", icon: Mail, isActive: pathname.startsWith("/invites") },
    {
      name: "Ajustes",
      href: "/settings",
      icon: Settings,
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <div className="fixed sm:hidden w-full bottom-0 p-4">
      <div className="flex justify-between gap-2 bg-white p-1.5 border border-primary/20 rounded-full shadow-md shadow-primary/10 overflow-scroll">
        {navigation.map((navItem) => {
          return (
            <Link
              key={`bottom-nav-tem-${navItem.name}`}
              href={navItem.href}
              className={cn(
                "flex justify-center items-center size-12 border border-primary/20 rounded-full bg-primary-50",
                "transition-all duration-500 ease-out",
                navItem.isActive && "flex-1 size-auto px-4 bg-primary shadow",
              )}
            >
              <navItem.icon
                className={cn(
                  "size-5 text-primary transition-colors duration-500 ease-out",
                  navItem.isActive && "text-white",
                )}
              />
              <div
                className={cn(
                  "font-poppins text-xs text-white font-medium overflow-hidden transition-all duration-500 ease-out",
                  navItem.isActive ? "max-w-24 opacity-100 pl-2" : "max-w-0 opacity-0",
                )}
              >
                {navItem.name}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
