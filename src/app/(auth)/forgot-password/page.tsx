
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";

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
import { Logo } from "@/components/Logo";
import { Mail } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: "Correo Enviado",
        description: "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.",
      });
      form.reset();
      // Optionally redirect or show a more persistent success message
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      // Avoid giving away information about whether an email exists or not for security.
      toast({
        title: "Solicitud Procesada",
        description: "Si tu email está registrado, recibirás un enlace para restablecer la contraseña. Revisa también tu carpeta de spam.",
        variant: "default", // Use default variant to not imply error
      });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
      <Logo size="lg" className="mb-8" />
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Restablecer Contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enviando..." : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Enlace de Restablecimiento
                  </>
                )}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
