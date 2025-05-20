
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem } from "@/types";
import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import { SuggestOutfitForm } from "@/components/suggestions/SuggestOutfitForm";
import { SuggestedOutfitDisplay } from "@/components/suggestions/SuggestedOutfitDisplay";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuggestionsPage() {
  const { user } = useAuth();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [suggestion, setSuggestion] = useState<SuggestOutfitOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    async function fetchWardrobe() {
      if (user) {
        setIsLoadingWardrobe(true);
        const q = query(collection(db, "clothingItems"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const items: ClothingItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as ClothingItem);
        });
        setWardrobe(items);
        setIsLoadingWardrobe(false);
      }
    }
    fetchWardrobe();
  }, [user]);

  if (isLoadingWardrobe) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-1/4" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sugerencias de Atuendos con IA</h1>
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
        <SuggestedOutfitDisplay suggestion={suggestion} />
      )}
    </div>
  );
}
