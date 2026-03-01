import { HomeScreen } from "@/screens";
import { getHomeData, getProfile } from "@/services";
import type { Tables } from "@nascere/supabase";
import { redirect } from "next/navigation";

type Profile = Tables<"users">;

export const revalidate = 300;

export default async function Home() {
  const [{ profile }, homeData] = await Promise.all([getProfile(), getHomeData()]);

  if (!profile?.professional_type) {
    redirect("/select-type");
  }

  return <HomeScreen profile={profile as Profile} homeData={homeData} />;
}
