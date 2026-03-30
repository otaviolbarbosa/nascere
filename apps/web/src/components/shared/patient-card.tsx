import { dayjs } from "@/lib/dayjs";
import type { PatientWithGestationalInfo, TeamMember } from "@/types";
import { getInitials } from "@/utils";
import { Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import TeamMembersAvatars from "./team-members-avatars";

export function PatientCard({
  patient,
  teamMembers,
}: {
  patient: PatientWithGestationalInfo;
  teamMembers?: TeamMember[];
}) {
  const formattedGestationalAge = (weeks: number, days: number) => {
    let output = "";
    output += `${weeks} semana${weeks === 1 ? "" : "s"}`;

    if (days > 0) {
      output += ` e ${days} dia${days === 1 ? "" : "s"}`;
    }

    return output;
  };

  const mainTeamMembers = teamMembers?.filter((teamMember) => !teamMember.is_backup);

  const dppFormatted = dayjs(patient.due_date).format("DD/MM");
  const statusColor =
    patient.weeks >= 37 ? "bg-orange-400" : patient.weeks >= 28 ? "bg-blue-400" : "bg-green-400";

  return (
    <div className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow">
        <svg className="-rotate-90 absolute inset-0" viewBox="0 0 48 48" fill="none">
          <title>Progress Bar</title>
          <circle
            cx="24"
            cy="24"
            r="23"
            strokeWidth="2"
            stroke="hsl(var(--primary))"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={2 * Math.PI * 22 * (1 - patient.progress / 100)}
          />
        </svg>
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
          {/* {getInitials(patient.name)} */}
          <Avatar className="h-11 w-11 bg-white shadow-md ring-1 ring-primary/25">
            <AvatarImage
              src={undefined}
              alt={patient.name || ""}
              className="rounded-full object-cover"
            />
            <AvatarFallback className="bg-muted font-semibold text-lg text-primary">
              {getInitials(patient.name ?? "")}
            </AvatarFallback>
          </Avatar>
          <div
            className={`absolute right-0.5 bottom-0.5 h-2 w-2 shrink-0 rounded-full ${statusColor}`}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{patient.name}</h4>
            </div>
            <div className="flex gap-2 text-muted-foreground text-sm">
              <span>DPP: {dppFormatted}</span>
              &bull;
              <span className="flex items-center gap-2 text-muted-foreground">
                {formattedGestationalAge(patient.weeks, patient.days)}
                {patient.weeks >= 40 && (
                  <Flame className="size-4 text-destructive" fill="hsl(var(--destructive))" />
                )}
              </span>
            </div>
          </div>
          {mainTeamMembers && mainTeamMembers.length > 0 && (
            <div>
              <TeamMembersAvatars teamMembers={mainTeamMembers} patientId={patient.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
