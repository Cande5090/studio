
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const watchedEmail = form.watch("email");

  useEffect(() => {
    // Reiniciar el contador de intentos si el email cambia
    setLoginAttempts(0);
  }, [watchedEmail]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión correctamente." });
      setLoginAttempts(0); // Reiniciar intentos en éxito
      router.push("/dashboard/wardrobe");
    } catch (error: any) {
      console.error("Error signing in:", error); // Esto es útil para depuración, es normal que aparezca el error de Firebase aquí.

      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        toast({
          title: "Demasiados intentos fallidos",
          description: "Serás redirigido para restablecer tu contraseña.",
          variant: "destructive",
        });
        router.push("/forgot-password");
        return; // Importante para no mostrar el siguiente toast
      }
      
      let message = "Error al iniciar sesión. Por favor, inténtalo de nuevo.";
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = `Email o contraseña incorrectos. Intento ${newAttempts} de ${MAX_LOGIN_ATTEMPTS}.`;
      } else if (error.code === 'auth/too-many-requests') {
        message = "Has intentado iniciar sesión demasiadas veces. Por favor, espera un momento o restablece tu contraseña.";
      }
      
      toast({
        title: "Error de inicio de sesión",
        description: message,
        variant: "destructive",
      });
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
