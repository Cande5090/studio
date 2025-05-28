
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

const MAX_LOGIN_ATTEMPTS = 4;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const watchedEmail = form.watch("email");

  useEffect(() => {
    // Reiniciar el contador de intentos y el error si el email cambia
    setLoginAttempts(0);
    setAuthError(null);
  }, [watchedEmail]);

  // Limpiar el error de autenticación si cualquier campo del formulario cambia
  useEffect(() => {
    const subscription = form.watch(() => setAuthError(null));
    return () => subscription.unsubscribe();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setAuthError(null); // Limpiar errores previos al enviar
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión correctamente." });
      setLoginAttempts(0); // Reiniciar intentos en éxito
      router.push("/dashboard/wardrobe");
    } catch (error: any) {
      console.error("Error signing in:", error); // Esto es útil para depuración

      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        toast({
          title: "Demasiados intentos fallidos",
          description: "Serás redirigido para restablecer tu contraseña.",
          variant: "default", 
        });
        router.push("/forgot-password");
        return; 
      }
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("Email o contraseña incorrectos.");
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError("Has intentado iniciar sesión demasiadas veces. Por favor, espera un momento o restablece tu contraseña.");
      } else {
        setAuthError("Error al iniciar sesión. Por favor, inténtalo de nuevo.");
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
       <Logo size="lg" className="mb-8" />
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Accede a tu armario virtual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {authError && (
                <p className="text-sm font-medium text-destructive">{authError}</p>
              )}
               <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
