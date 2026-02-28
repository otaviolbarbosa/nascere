import { cn } from "@/lib/utils";
import { getInitials } from "@/utils";
import Image from "next/image";
import type { HTMLAttributes } from "react";

type AvatarProps = {
  src: string;
  name: string;
  size?: number;
  className?: HTMLAttributes<HTMLDivElement>["className"];
};

export default function Avatar({ src, name, size = 9, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden overflow-hidden rounded-full rounded-full bg-muted font-semibold text-muted-foreground",
        `size-${size}`,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          className={cn(`size-${size} object-cover`)}
          alt="User avatar"
          width={size * 4}
          height={size * 4}
          priority
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
