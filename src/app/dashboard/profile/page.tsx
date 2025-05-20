
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, UserCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return <p>Cargando perfil...</p>;
  }

  const getInitials = (email?: string | null) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Settings className="h-8 w-8 text-primary"/>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
      </div>
      
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "Usuario"} />
            <AvatarFallback className="text-3xl">{getInitials(user.email)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.displayName || "Usuario de Outfitly"}</CardTitle>
          <CardDescription>Gestiona la información de tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email || ""} disabled />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre de Usuario (Próximamente)</Label>
            <Input id="displayName" placeholder="Tu nombre de usuario" value={user.displayName || ""} disabled />
          </div>

          <Button className="w-full" disabled>Guardar Cambios (Próximamente)</Button>
           <p className="text-sm text-muted-foreground text-center">La edición de perfil estará disponible pronto.</p>
        </CardContent>
      </Card>
    </div>
  );
}
