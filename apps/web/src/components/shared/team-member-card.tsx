import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TeamMember } from "@/types";
import { getInitials } from "@/utils";
import { professionalTypeLabels } from "@/utils/team";

type TeamMemberCardProps = {
  member: TeamMember;
};

export default function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex w-full items-center gap-3 overflow-hidden">
          <div className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-muted font-poppins font-semibold text-muted-foreground">
            {getInitials(member.professional?.name)}
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 justify-between gap-2 overflow-hidden truncate whitespace-nowrap">
              <p className="font-medium">{member.professional?.name}</p>
              <Badge variant="outline" className="rounded-full">
                {professionalTypeLabels[member.professional_type]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{member.professional?.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
