
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard/wardrobe');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-sans items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (user) { 
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-sans items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="container mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center">
          <nav className="space-x-2 sm:space-x-3">
            <Button 
              variant="default" 
              asChild 
              className="text-sm sm:text-base bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </Link>
            </Button>
            <Button 
              variant="default"
              asChild 
              className="text-sm sm:text-base"
            >
              <Link href="/register">
                <UserPlus className="mr-2 h-4 w-4" />
                Registrarse
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content - New Centered Design */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <p 
          className="text-2xl md:text-3xl text-foreground mb-3 md:mb-4 tracking-wide" 
          style={{ fontFamily: 'Wilkysta, Georgia, serif' }}
        >
          Menos dudas frente al espejo
        </p>
        <div className="flex items-center justify-center w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl my-4 md:my-6">
          <hr className="flex-grow border-t border-foreground/60" />
          <h1
            className="text-7xl xs:text-8xl sm:text-9xl md:text-[10rem] lg:text-[11rem] font-bold text-foreground mx-4 sm:mx-6 md:mx-8 whitespace-nowrap tracking-wide"
            style={{ fontFamily: 'Fashion Wacks, Georgia, serif' }}
          >
            Outfitly
          </h1>
          <hr className="flex-grow border-t border-foreground/60" />
        </div>
        <p 
          className="text-2xl md:text-3xl text-foreground mt-3 md:mt-4 tracking-wide" 
          style={{ fontFamily: 'Wilkysta, Georgia, serif' }}
        >
          Todo en un solo lugar
        </p>
      </main>

      {/* Footer */}
      <footer className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Outfitly. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
