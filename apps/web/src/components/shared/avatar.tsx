import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils";
import Image from "next/image";
import type { HTMLAttributes } from "react";

type AvatarProps = {
  className?: HTMLAttributes<HTMLDivElement>["className"];
};

export default function Avatar({ className }: AvatarProps) {
  const { profile } = useAuth();

  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center overflow-hidden overflow-hidden rounded-full rounded-full border bg-primary-100 font-semibold text-primary-700",
        className,
      )}
    >
      {profile?.avatar_url ? (
        <Image src={profile.avatar_url} alt="User avatar" width={36} height={36} priority />
      ) : (
        getInitials(profile?.name)
      )}
    </div>
  );
}
