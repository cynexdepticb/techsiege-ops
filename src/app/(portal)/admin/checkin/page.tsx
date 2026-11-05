import type { Metadata } from "next";
import { requireModule } from "@/lib/guards";
import { PageHeader } from "@/components/ui/fields";
import { CheckinScanner } from "@/components/checkin/scanner";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Desk check-in" };
export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const [actor, settings] = await Promise.all([requireModule("checkin"), getSettings()]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Desk check-in"
        description="Use a team code or attendee email to verify admission and check in participants."
      />
      <CheckinScanner actorName={actor.name} />
    </div>
  );
}
