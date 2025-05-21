
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="container mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Logo size="md" />
          <nav className="space-x-2 sm:space-x-3">
            <Button variant="ghost" asChild className="text-sm sm:text-base">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </Link>
            </Button>
            <Button asChild className="text-sm sm:text-base bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/register">
                <UserPlus className="mr-2 h-4 w-4" />
                Registrarse
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="lg:col-span-3 space-y-6 sm:space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-primary" style={{ fontFamily: 'var(--font-geist-sans), Georgia, serif' }}>
              Menos dudas<br />frente al espejo
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Explora tu guardarropa digital, recibe sugerencias de atuendos personalizadas por IA y redescubre tu estilo único. Outfitly te ayuda a organizar tus prendas y a crear combinaciones sorprendentes sin esfuerzo.
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-primary pt-4" style={{ fontFamily: 'var(--font-geist-sans), Georgia, serif' }}>
              Todo en un solo lugar
            </h2>
             {/* Optional CTA for future
            <Button size="lg" asChild className="mt-6 !bg-accent hover:!bg-accent/90 !text-accent-foreground">
              <Link href="/register">
                Comienza Ahora
              </Link>
            </Button>
            */}
          </div>

          {/* Right Column: Image */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end relative mt-8 lg:mt-0">
            <div className="bg-card p-3 sm:p-4 rounded-lg shadow-xl relative w-full max-w-sm sm:max-w-md lg:max-w-none">
              <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-background/70 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded-full shadow-sm z-10">
                Modelo de Outfitly
              </div>
              <div className="relative aspect-[5/7] w-full">
                <Image
                  src="https://placehold.co/500x700.png"
                  alt="Modelo de Outfitly mostrando la aplicación en un dispositivo"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md"
                  data-ai-hint="fashion app mockup"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer (Optional) */}
      <footer className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Outfitly. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
