
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { Loader2, Sparkles } from "lucide-react"; 

import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem } from "@/types";
import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import { SuggestOutfitForm } from "@/components/suggestions/SuggestOutfitForm";
import { SuggestedOutfitDisplay } from "@/components/suggestions/SuggestedOutfitDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function SuggestionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [suggestion, setSuggestion] = useState<SuggestOutfitOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoadingWardrobe(true);
      const q = query(
        collection(db, "clothingItems"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc") // Para que el form pueda priorizar recientes
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: ClothingItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          items.push({
            id: doc.id,
            ...data,
            createdAt,
          } as ClothingItem);
        });
        setWardrobe(items);
        setIsLoadingWardrobe(false);
      }, (error) => {
        console.error("Error al cargar el armario para sugerencias:", error);
        toast({
          title: "Error al Cargar Armario",
          description: "No se pudieron cargar tus prendas para las sugerencias.",
          variant: "destructive",
        });
        setIsLoadingWardrobe(false);
      });
      return () => unsubscribe();
    } else {
      setWardrobe([]);
      setIsLoadingWardrobe(false);
    }
  }, [user, toast]);

  if (isLoadingWardrobe) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sugerencias de Outfit con IA</h1>
        <p className="text-muted-foreground">
          Describe la ocasión y deja que nuestra IA te sugiera el atuendo perfecto de tu propio armario.
        </p>
      </div>
      
      <SuggestOutfitForm
        wardrobe={wardrobe}
        onSuggestionReceived={setSuggestion}
        isSuggesting={isSuggesting}
        setIsSuggesting={setIsSuggesting}
      />

      {isSuggesting && (
        <div className="mt-8 flex flex-col items-center justify-center text-center p-10 border rounded-lg shadow-md bg-card">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-semibold">Creando tu atuendo...</p>
          <p className="text-muted-foreground">La IA está trabajando para encontrar la combinación perfecta.</p>
        </div>
      )}
      
      {!isSuggesting && suggestion && (
        <SuggestedOutfitDisplay suggestion={suggestion} wardrobe={wardrobe} />
      )}

      {!isSuggesting && !suggestion && wardrobe.length > 0 && (
        <div className="mt-8 text-center p-10 border-2 border-dashed border-border rounded-lg bg-card/50">
          <Sparkles className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">¿Listo para una sugerencia?</h2>
          <p className="text-muted-foreground">
            Define la ocasión arriba y pulsa "Sugerir Atuendo".
          </p>
        </div>
      )}

       {!isSuggesting && !suggestion && wardrobe.length === 0 && (
        <div className="mt-8 text-center p-10 border-2 border-dashed border-border rounded-lg bg-card/50">
          <Sparkles className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Tu armario está vacío</h2>
          <p className="text-muted-foreground">
            Añade algunas prendas a tu armario para poder recibir sugerencias de atuendos.
          </p>
        </div>
      )}
    </div>
  );
}
