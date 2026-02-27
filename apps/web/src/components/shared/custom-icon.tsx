import PregnantIcon from "@/assets/custom-icons/pregnant-icon";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
export type CustomIconName = "pregnant-icon";

const customIcons: Record<CustomIconName, React.ComponentType<IconProps>> = {
  "pregnant-icon": PregnantIcon,
};

type CustomIconProps = IconProps & {
  image: CustomIconName;
};

export default function CustomIcon({ image, ...props }: CustomIconProps) {
  const Icon = customIcons[image];
  return <Icon {...props} />;
}
