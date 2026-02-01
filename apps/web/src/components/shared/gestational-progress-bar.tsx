import { calculateGestationalProgress } from "@/lib/gestational-age";
import { cn } from "@/lib/utils";

type GestationalProgressBarProps = {
  dum: Date | string | null;
};

function getProgressColor(percentage: number): string {
  // Interpola cor de verde (hue 120) para vermelho (hue 0)
  const hue = 120 - (percentage / 100) * 120;
  // Interpola saturação de 100% para 70%
  const sat = 100 - (percentage / 100) * (100 - 70);
  // Interpola saturação de 100% para 70%
  const ligtht = 40 - (percentage / 100) * (40 - 50);

  return `hsl(${hue}, ${sat}%, ${ligtht}%)`;
}

export default function GestationalProgressBar({ dum }: GestationalProgressBarProps) {
  if (!dum) {
    return;
  }

  const percentage = calculateGestationalProgress(dum);
  const endColor = getProgressColor(percentage);

  const isFirstTrimester = percentage <= 33;
  const isSecondTrimester = percentage > 33 && percentage <= 66;
  const isThirdTrimester = percentage > 66;

  return (
    <div>
      <div className="flex w-full items-center text-gray-500">
        <div
          className={cn(
            "flex-1 text-center text-xs",
            isFirstTrimester && "font-bold text-black text-lg",
          )}
        >
          1º T
        </div>
        <div className="">•</div>
        <div
          className={cn(
            "flex-1 text-center text-xs",
            isSecondTrimester && "font-bold text-black text-lg",
          )}
        >
          2º T
        </div>
        <div className="">•</div>
        <div
          className={cn(
            "flex-1 text-center text-xs",
            isThirdTrimester && "font-bold text-black text-lg",
          )}
        >
          3º T
        </div>
      </div>
      <div className="w-full rounded-full bg-gray-100 p-0.5">
        <div
          className="h-2.5 rounded-full"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to right, hsl(120, 100%, 40%), ${endColor})`,
          }}
        />
      </div>
    </div>
  );
}
