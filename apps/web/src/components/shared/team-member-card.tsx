import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { TeamMember } from "@/types";
import { getInitials } from "@/utils";
import { professionalTypeLabels } from "@/utils/team";

type TeamMemberCardProps = {
  member: TeamMember;
};

export default function TeamMemberCard({ member }: TeamMemberCardProps) {
  const { user } = useAuth();

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-poppins font-semibold text-primary-700">
            {getInitials(member.professional?.name)}
          </div>
          <div className="flex-1">
            <p className="font-medium">{member.professional?.name}</p>
            <p className="text-muted-foreground text-sm">{member.professional?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="rounded-full">
              {professionalTypeLabels[member.professional_type]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
