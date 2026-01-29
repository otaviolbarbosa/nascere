"use client";

import { Bell, ChevronLeft, DotSquare, EllipsisVertical, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { getInitials } from "@/utils";

interface HeaderProps {
  title?: string;
  back?: boolean;
}

export function Header({ title, back }: HeaderProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    const scrollContainer = document.querySelector("main");

    const handleScroll = () => {
      const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    handleScroll();

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGoBack = router.back;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-gray-50 flex h-16 items-center gap-2 px-4 md:px-6 transition-shadow duration-300",
        isScrolled && "shadow-lg shadow-gray-200",
      )}
    >
      {/* Back button */}
      {back && (
        <Button variant="ghost" size="icon" className="md:hidden mx-0" onClick={handleGoBack}>
          <ChevronLeft />
        </Button>
      )}
      {/* Title */}
      {title && (
        <div className="flex-1">
          {title && <h1 className="font-poppins text-2xl font-semibold tracking-tight">{title}</h1>}
        </div>
      )}
      {/* Mobile menu */}
      <div className="flex gap-2 justify-center">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden overflow-hidden">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="User avatar" width={40} height={40} priority />
          ) : (
            getInitials(profile?.name)
          )}

          <span className="sr-only">Perfil</span>
        </Button>
      </div>
    </header>
  );
}
