
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, UserCircle, KeyRound, Mail, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateEmail } from "firebase/auth";

const displayNameFormSchema = z.object({
  displayName: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres." }).max(50, { message: "El nombre no puede exceder los 50 caracteres." }),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Por favor, introduce tu contraseña actual." }),
  newPassword: z.string().min(6, { message: "La nueva contraseña debe tener al menos 6 caracteres." }),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmNewPassword"],
});

const emailFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Por favor, introduce tu contraseña actual." }),
  newEmail: z.string().email({ message: "Por favor, introduce un email válido." }),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const displayNameForm = useForm<z.infer<typeof displayNameFormSchema>>({
    resolver: zodResolver(displayNameFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      currentPassword: "",
      newEmail: user?.email || "",
    },
  });

  // Update form defaults if user changes
  useState(() => {
    if (user) {
      displayNameForm.reset({ displayName: user.displayName || "" });
      emailForm.reset({ currentPassword: "", newEmail: user.email || ""});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, displayNameForm.reset, emailForm.reset]);


  const getInitials = (displayName?: string | null, email?: string | null) => {
    if (displayName) {
      const names = displayName.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  async function onSubmitDisplayName(values: z.infer<typeof displayNameFormSchema>) {
    if (!user) return;
    setIsUpdatingDisplayName(true);
    try {
      await updateProfile(user, { displayName: values.displayName });
      toast({ title: "¡Éxito!", description: "Nombre de usuario actualizado." });
      // user object in context will update automatically via onAuthStateChanged
    } catch (error: any) {
      console.error("Error updating display name:", error);
      toast({ title: "Error", description: error.message || "No se pudo actualizar el nombre de usuario.", variant: "destructive" });
    } finally {
      setIsUpdatingDisplayName(false);
    }
  }

  async function onSubmitPassword(values: z.infer<typeof passwordFormSchema>) {
    if (!user || !user.email) return;
    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, values.newPassword);
      toast({ title: "¡Éxito!", description: "Contraseña actualizada correctamente." });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Error updating password:", error);
      let description = "No se pudo actualizar la contraseña.";
      if (error.code === 'auth/wrong-password') {
        description = "La contraseña actual es incorrecta.";
      } else if (error.code === 'auth/weak-password') {
        description = "La nueva contraseña es demasiado débil.";
      }
      toast({ title: "Error al cambiar contraseña", description, variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function onSubmitEmail(values: z.infer<typeof emailFormSchema>) {
    if (!user || !user.email) return;
    setIsUpdatingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, values.newEmail);
      toast({ title: "¡Éxito!", description: "Email actualizado. Por favor, verifica tu nuevo email." });
      // User email in UI will update once re-verified or on next login
      // Or if we force a refresh of user token. For now, it's fine.
      emailForm.reset({currentPassword: "", newEmail: values.newEmail});

    } catch (error: any) {
      console.error("Error updating email:", error);
      let description = "No se pudo actualizar el email.";
      if (error.code === 'auth/wrong-password') {
        description = "La contraseña actual es incorrecta.";
      } else if (error.code === 'auth/email-already-in-use') {
        description = "El nuevo email ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/invalid-email') {
        description = "El nuevo email no es válido.";
      }
      toast({ title: "Error al cambiar email", description, variant: "destructive" });
    } finally {
      setIsUpdatingEmail(false);
    }
  }


  if (!user) {
    return <p>Cargando perfil...</p>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-primary"/>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
      </div>
      
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "Usuario"} />
            <AvatarFallback className="text-3xl">{getInitials(user.displayName, user.email)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.displayName || "Usuario de Outfitly"}</CardTitle>
          <CardDescription>Gestiona la información de tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <Label htmlFor="email">Email (Verificado)</Label>
            <Input id="email" type="email" value={user.email || ""} disabled className="text-muted-foreground" />
        </CardContent>
      </Card>

      {/* Update Display Name Form */}
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary"/> Nombre de Usuario</CardTitle>
          <CardDescription>Cambia tu nombre de usuario visible en la aplicación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...displayNameForm}>
            <form onSubmit={displayNameForm.handleSubmit(onSubmitDisplayName)} className="space-y-4">
              <FormField
                control={displayNameForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre de usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isUpdatingDisplayName}>
                {isUpdatingDisplayName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Nombre
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary"/> Cambiar Contraseña</CardTitle>
          <CardDescription>Actualiza tu contraseña. Necesitarás tu contraseña actual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña Actual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isUpdatingPassword}>
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cambiar Contraseña
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Change Email Form */}
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-6 w-6 text-primary"/> Cambiar Email</CardTitle>
          <CardDescription>Actualiza tu dirección de email. Necesitarás tu contraseña actual y verificar el nuevo email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña Actual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu.nuevo@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isUpdatingEmail}>
                {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cambiar Email
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
