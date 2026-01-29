"use client";
import { Header } from "@/components/layouts/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

export default function Home() {
  const { profile } = useAuth();

  return (
    <div>
      <Header title={`Olá, ${profile?.name ?? "amiga!"}!`} />

      <div className="px-4 space-y-2">
        <h1 className="font-poppins text-xl font-medium">Minhas Gestantes</h1>
        <Card>
          <CardContent className="flex p-4 gap-2 divide-x">
            <div className="flex-1 justify-center items-center space-y-2 text-center gap-2">
              <div className="font-medium text-sm">1ª Trim.</div>
              <div className="flex justify-around items-center">
                <div className="text-3xl font-semibold">2</div>
              </div>
            </div>
            <div className="flex-1 justify-center items-center space-y-2 text-center gap-2">
              <div className="font-medium text-sm">2ª Trim.</div>
              <div className="flex justify-around items-center">
                <div className="text-3xl font-semibold">2</div>
              </div>
            </div>
            <div className="flex-1 justify-center items-center space-y-2 text-center gap-2">
              <div className="font-medium text-sm">3ª Trim.</div>
              <div className="flex justify-around items-center">
                <div className="text-3xl font-semibold">2</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <h1 className="font-poppins text-xl font-medium">Próximas consultas</h1>
        {/* <Card></Card> */}
      </div>
    </div>
  );
}
