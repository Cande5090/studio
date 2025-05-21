
"use client";

import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import type { ClothingItem } from "@/types";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText, Shirt, Save, Loader2, RotateCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

interface SuggestedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput | null;
  wardrobe: ClothingItem[];
  occasion?: string | null;
}

export function SuggestedOutfitDisplay({ suggestion, wardrobe, occasion }: SuggestedOutfitDisplayProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [outfitNameToSave, setOutfitNameToSave] = useState("");
  const [isSaveAlertDialogOpen, setIsSaveAlertDialogOpen] = useState(false);

  const wardrobeMap = useMemo(() => {
    return new Map(wardrobe.map(item => [item.id, item]));
  }, [wardrobe]);

  if (!suggestion) {
    return null;
  }

  const hasOutfitItems = suggestion.outfitSuggestion && suggestion.outfitSuggestion.length > 0;

  const handleSaveOutfit = async () => {
    if (!user || !suggestion || !suggestion.outfitSuggestion || suggestion.outfitSuggestion.length === 0) {
      toast({ title: "Error", description: "No hay sugerencia para guardar o no has iniciado sesión.", variant: "destructive" });
      return;
    }
    if (!outfitNameToSave.trim()) {
        toast({ title: "Nombre Requerido", description: "Por favor, ingresa un nombre para el atuendo.", variant: "destructive"});
        return;
    }

    setIsSavingOutfit(true);
    try {
      const itemIdsToSave = suggestion.outfitSuggestion.map(item => item.id).filter(id => !!id);
      
      if (itemIdsToSave.length === 0) {
        toast({ title: "Error", description: "La sugerencia de la IA no contenía IDs de prendas válidos.", variant: "destructive" });
        setIsSavingOutfit(false);
        return;
      }

      const newOutfit = {
        userId: user.uid,
        name: outfitNameToSave.trim(),
        itemIds: itemIdsToSave,
        description: occasion ? `Sugerido por IA para: ${occasion}` : "Atuendo sugerido por IA",
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "outfits"), newOutfit);
      toast({ title: "¡Atuendo Guardado!", description: `"${outfitNameToSave.trim()}" ha sido guardado en Mis Atuendos.` });
      setIsSaveAlertDialogOpen(false);
      setOutfitNameToSave("");
    } catch (error: any) {
      console.error("Error saving suggested outfit:", error);
      toast({ title: "Error al Guardar", description: error.message || "No se pudo guardar el atuendo.", variant: "destructive" });
    } finally {
      setIsSavingOutfit(false);
    }
  };


  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Tu Atuendo Sugerido</CardTitle>
        {(hasOutfitItems || suggestion.reasoning) && (
          <CardDescription>Basado en tu armario y la ocasión especificada.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {hasOutfitItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestion.outfitSuggestion!.map((suggestedItem, index) => {
              const originalItemId = suggestedItem?.id;
              const originalItem = originalItemId ? wardrobeMap.get(originalItemId) : undefined;

              let displayName = originalItem?.name; // Priorizar el nombre original de la prenda
              if (!displayName) {
                // Fallback si no se encuentra el nombre original (lo cual no debería pasar si el ID es correcto),
                // se intenta con tipo y color si la IA los proveyó.
                const typeFromAI = suggestedItem.type || "";
                const colorFromAI = suggestedItem.color || "";
                displayName = `${typeFromAI} ${colorFromAI}`.trim() || "Prenda";
              }
              
              let displayImageUrl = originalItem?.imageUrl || "https://placehold.co/200x250.png?text=No+Disp.";
              let aiHint = "clothing item";

              if (originalItem?.type && originalItem.type.toLowerCase() !== "otro") {
                aiHint = originalItem.type.split(' ')[0].toLowerCase();
              } else if (suggestedItem.type) {
                aiHint = suggestedItem.type.split(' ')[0].toLowerCase();
              }
              
              return (
                <div key={originalItemId || `suggested-placeholder-${index}`} className="flex flex-col items-center space-y-2 p-2 border rounded-lg bg-muted/30">
                  <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
                   <Image
                      src={displayImageUrl}
                      alt={displayName || `Prenda sugerida ${index + 1}`}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={aiHint}
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/200x250.png?text=Error";
                        e.currentTarget.alt = "Error al cargar imagen";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={displayName}>
                    {displayName}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
           suggestion.reasoning && !hasOutfitItems ? (
            <p className="text-sm text-muted-foreground">
              La IA no pudo formar un atuendo completo esta vez. Lee la explicación abajo.
            </p>
           ) : (
            <div className="text-center py-8">
                <Shirt className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {suggestion.reasoning || "La IA no pudo generar un atuendo o dar una explicación esta vez."}
                </p>
            </div>
           )
        )}
      </CardContent>

      {hasOutfitItems && user && (
        <CardFooter className="flex-col items-start gap-4 pt-6 border-t">
          <div>
            <h3 className="text-md font-semibold mb-2">Guardar esta sugerencia:</h3>
            <AlertDialog open={isSaveAlertDialogOpen} onOpenChange={setIsSaveAlertDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button onClick={() => {
                  setOutfitNameToSave(occasion ? `Sugerencia IA: ${occasion}` : "Atuendo Sugerido por IA");
                  setIsSaveAlertDialogOpen(true);
                }}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Sugerencia de Atuendo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Guardar Atuendo Sugerido</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dale un nombre a este atuendo para guardarlo en "Mis Atuendos".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="outfit-name-save-suggestion" className="text-right">
                      Nombre
                    </Label>
                    <Input
                      id="outfit-name-save-suggestion"
                      value={outfitNameToSave}
                      onChange={(e) => setOutfitNameToSave(e.target.value)}
                      className="col-span-3"
                      placeholder="Ej: Casual para la uni"
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsSaveAlertDialogOpen(false)} disabled={isSavingOutfit}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveOutfit} disabled={isSavingOutfit || !outfitNameToSave.trim()}>
                    {isSavingOutfit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Atuendo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      )}

      {suggestion?.reasoning && (
        <CardContent className="space-y-2 pt-4 border-t mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary"/>
              Explicación de la IA:
            </h3>
          <ScrollArea className="h-24 rounded-md border p-3 text-sm bg-muted/20">
            <p className="whitespace-pre-wrap">{suggestion.reasoning}</p>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
