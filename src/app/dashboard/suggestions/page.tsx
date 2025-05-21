
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { Loader2, Sparkles, RotateCw } from "lucide-react"; 

import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem } from "@/types";
import type { SuggestOutfitInput, SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import { suggestOutfit } from "@/ai/flows/suggest-outfit";
import { SuggestOutfitForm } from "@/components/suggestions/SuggestOutfitForm";
import { SuggestedOutfitDisplay } from "@/components/suggestions/SuggestedOutfitDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const MAX_WARDROBE_ITEMS_FOR_AI = 50;
const AI_SUGGESTION_TIMEOUT_MS = 90000; // 90 segundos

export default function SuggestionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [suggestion, setSuggestion] = useState<SuggestOutfitOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [lastOccasion, setLastOccasion] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setIsLoadingWardrobe(true);
      const q = query(
        collection(db, "clothingItems"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
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

  const performSuggestion = async (occasion: string) => {
    if (wardrobe.length === 0) {
      toast({ title: "Armario vacío", description: "Añade prendas a tu armario antes de pedir sugerencias.", variant: "destructive" });
      return;
    }

    setIsSuggesting(true);
    setSuggestion(null); 
    setLastOccasion(occasion); // Guardar la ocasión actual

    try {
      const sortedWardrobe = [...wardrobe].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const limitedWardrobe = sortedWardrobe.slice(0, MAX_WARDROBE_ITEMS_FOR_AI);
      
      const wardrobeForAI = limitedWardrobe.map(item => ({
        id: item.id, 
        type: item.type,
        color: item.color,
        season: item.season,
        material: item.fabric, // Asegúrate de que esto coincida con WardrobeItemForAI
      }));

      if (wardrobe.length > MAX_WARDROBE_ITEMS_FOR_AI) {
        toast({
          title: "Nota sobre el armario",
          description: `Para optimizar la sugerencia, se consideraron tus ${MAX_WARDROBE_ITEMS_FOR_AI} prendas más recientes.`,
          duration: 7000,
        });
      }

      const input: SuggestOutfitInput = {
        occasion: occasion,
        wardrobe: wardrobeForAI,
      };
      
      const suggestionPromise = suggestOutfit(input);
      const timeoutPromise = new Promise<SuggestOutfitOutput>((_, reject) =>
        setTimeout(() => reject(new Error("La sugerencia de la IA ha tardado demasiado.")), AI_SUGGESTION_TIMEOUT_MS)
      );

      const result = await Promise.race([suggestionPromise, timeoutPromise]);
      setSuggestion(result);

    } catch (error: any) {
      console.error("Error sugiriendo atuendo:", error);
      let errorMessage = "No se pudo sugerir un atuendo. Inténtalo de nuevo.";
      if (error.message === "La sugerencia de la IA ha tardado demasiado.") {
        errorMessage = "La IA tardó demasiado en responder. Por favor, inténtalo de nuevo más tarde.";
      } else if (error.message && error.message.includes("INVALID_ARGUMENT")) {
        errorMessage = "Hubo un problema con los datos enviados o recibidos de la IA. Revisa la consola.";
      }
      toast({ title: "Error de IA", description: errorMessage, variant: "destructive" });
      setSuggestion(null);
    } finally {
      setIsSuggesting(false);
    }
  };

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
        onSuggest={performSuggestion} 
        isSuggesting={isSuggesting}
      />

      {isSuggesting && (
        <div className="mt-8 flex flex-col items-center justify-center text-center p-10 border rounded-lg shadow-md bg-card">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-semibold">Creando tu atuendo...</p>
          <p className="text-muted-foreground">La IA está trabajando para encontrar la combinación perfecta.</p>
        </div>
      )}
      
      {!isSuggesting && suggestion && (
        <div className="mt-8">
          <SuggestedOutfitDisplay suggestion={suggestion} wardrobe={wardrobe} occasion={lastOccasion} />
          {lastOccasion && ( // Solo mostrar si hay una última ocasión
            <div className="mt-6 text-center">
              <Button 
                onClick={() => performSuggestion(lastOccasion)} 
                disabled={isSuggesting}
                variant="outline"
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Generar Otra Sugerencia para "{lastOccasion}"
              </Button>
            </div>
          )}
        </div>
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
