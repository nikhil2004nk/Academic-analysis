"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back to the Academics portal, <span className="font-semibold text-primary">{user?.name}</span>.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-hover">
          <CardHeader>
            <CardTitle className="text-lg">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary capitalize">{user?.role}</p>
          </CardContent>
        </Card>
        
        <Card className="animate-hover">
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <p className="text-xl font-bold text-white">All systems operational</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
