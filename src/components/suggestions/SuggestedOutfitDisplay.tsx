
"use client";

import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import type { ClothingItem } from "@/types";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText, Shirt, Save, Loader2, PlusCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const DEFAULT_COLLECTION_NAME = "General";
const CREATE_NEW_COLLECTION_VALUE = "__CREATE_NEW__";

interface SuggestedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput | null;
  wardrobe: ClothingItem[];
  occasion?: string | null;
  existingCollectionNames: string[];
}

export function SuggestedOutfitDisplay({ suggestion, wardrobe, occasion, existingCollectionNames }: SuggestedOutfitDisplayProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [outfitNameToSave, setOutfitNameToSave] = useState("");
  const [isSaveAlertDialogOpen, setIsSaveAlertDialogOpen] = useState(false);

  const [selectedCollectionForSave, setSelectedCollectionForSave] = useState<string>(DEFAULT_COLLECTION_NAME);
  const [newCollectionNameInputForSave, setNewCollectionNameInputForSave] = useState("");
  const [showNewCollectionInputForSave, setShowNewCollectionInputForSave] = useState(false);

  const wardrobeMap = useMemo(() => {
    return new Map(wardrobe.map(item => [item.id, item]));
  }, [wardrobe]);

  useEffect(() => {
    if (selectedCollectionForSave === CREATE_NEW_COLLECTION_VALUE) {
      setShowNewCollectionInputForSave(true);
    } else {
      setShowNewCollectionInputForSave(false);
      setNewCollectionNameInputForSave(""); // Clear if existing or default selected
    }
  }, [selectedCollectionForSave]);

  useEffect(() => {
    // Reset local dialog state when the dialog closes or suggestion changes
    if (!isSaveAlertDialogOpen) {
        setOutfitNameToSave(occasion ? `Sugerencia IA: ${occasion}` : "Atuendo Sugerido por IA");
        setSelectedCollectionForSave(DEFAULT_COLLECTION_NAME);
        setNewCollectionNameInputForSave("");
        setShowNewCollectionInputForSave(false);
    }
  }, [isSaveAlertDialogOpen, occasion, suggestion]);


  if (!suggestion) {
    return null;
  }

  const hasOutfitItems = suggestion.outfitSuggestion && suggestion.outfitSuggestion.length > 0;

  const handleSaveOutfit = async () => {
    if (!user || !suggestion || !suggestion.outfitSuggestion || suggestion.outfitSuggestion.length === 0) {
      toast({ title: "Error", description: "No hay sugerencia para guardar o no has iniciado sesión.", variant: "destructive" });
      return;
    }
    const trimmedOutfitName = outfitNameToSave.trim();
    if (!trimmedOutfitName) {
        toast({ title: "Nombre Requerido", description: "Por favor, ingresa un nombre para el atuendo.", variant: "destructive"});
        return;
    }

    let finalCollectionName = DEFAULT_COLLECTION_NAME;
    if (selectedCollectionForSave === CREATE_NEW_COLLECTION_VALUE) {
      const trimmedNewCollection = newCollectionNameInputForSave.trim();
      if (!trimmedNewCollection) {
        toast({ title: "Nombre de Colección Requerido", description: "Si creas una nueva colección, debes darle un nombre.", variant: "destructive" });
        return;
      }
      if (trimmedNewCollection === DEFAULT_COLLECTION_NAME) {
        toast({ title: "Nombre de Colección Inválido", description: `No puedes crear una colección llamada "${DEFAULT_COLLECTION_NAME}".`, variant: "destructive" });
        return;
      }
      if (existingCollectionNames.includes(trimmedNewCollection)) {
        toast({ title: "Colección Duplicada", description: `La colección "${trimmedNewCollection}" ya existe. Elige otro nombre o selecciónala de la lista.`, variant: "destructive" });
        return;
      }
      finalCollectionName = trimmedNewCollection;
    } else if (selectedCollectionForSave) {
      finalCollectionName = selectedCollectionForSave;
    }
    
    if (finalCollectionName === CREATE_NEW_COLLECTION_VALUE) { // Fallback
        finalCollectionName = DEFAULT_COLLECTION_NAME;
    }


    setIsSavingOutfit(true);
    try {
      const itemIdsToSave = suggestion.outfitSuggestion.map(item => item.id).filter(id => !!id);
      
      if (itemIdsToSave.length === 0) {
        toast({ title: "Error", description: "La sugerencia de la IA no contenía IDs de prendas válidos.", variant: "destructive" });
        setIsSavingOutfit(false);
        return;
      }

      const newOutfitData = {
        userId: user.uid,
        name: trimmedOutfitName,
        itemIds: itemIdsToSave,
        collectionName: finalCollectionName,
        description: occasion ? `Sugerido por IA para: ${occasion}` : "Atuendo sugerido por IA",
        createdAt: serverTimestamp(),
        isFavorite: false, 
      };
      await addDoc(collection(db, "outfits"), newOutfitData);
      toast({ title: "¡Atuendo Guardado!", description: `"${trimmedOutfitName}" ha sido guardado en Mis Atuendos.` });
      setIsSaveAlertDialogOpen(false);
      // Resetting state is now handled by useEffect on isSaveAlertDialogOpen
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
          <CardDescription>Basado en tu armario y la ocasión: "{occasion || 'No especificada'}".</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {hasOutfitItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestion.outfitSuggestion!.map((suggestedItem, index) => {
              const originalItemId = suggestedItem?.id;
              const originalItem = originalItemId ? wardrobeMap.get(originalItemId) : undefined;

              let itemName = originalItem?.name || "Prenda Desconocida";
              if (!originalItem?.name) { // Fallback if original name is not found
                if (suggestedItem.type && suggestedItem.color) {
                    itemName = `${suggestedItem.type} ${suggestedItem.color}`;
                } else if (suggestedItem.type) {
                    itemName = suggestedItem.type;
                }
              }
              
              let displayImageUrl = originalItem?.imageUrl && originalItem.imageUrl.startsWith('data:image') 
                                    ? originalItem.imageUrl 
                                    : "https://placehold.co/200x250.png?text=No+Disp.";
              
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
                      alt={itemName || `Prenda sugerida ${index + 1}`}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={aiHint}
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/200x250.png?text=Error";
                        e.currentTarget.alt = "Error al cargar imagen";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={itemName}>
                    {itemName}
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
                  setSelectedCollectionForSave(DEFAULT_COLLECTION_NAME); // Reset to default
                  setIsSaveAlertDialogOpen(true);
                }}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Sugerencia de Atuendo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Guardar Atuendo Sugerido</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dale un nombre y elige una colección para este atuendo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1">
                    <Label htmlFor="outfit-name-save-suggestion">
                      Nombre del Atuendo
                    </Label>
                    <Input
                      id="outfit-name-save-suggestion"
                      value={outfitNameToSave}
                      onChange={(e) => setOutfitNameToSave(e.target.value)}
                      placeholder="Ej: Casual para la uni"
                      disabled={isSavingOutfit}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="collection-select-save-suggestion">
                      Colección
                    </Label>
                    <Select
                      value={selectedCollectionForSave}
                      onValueChange={setSelectedCollectionForSave}
                      disabled={isSavingOutfit}
                    >
                      <SelectTrigger id="collection-select-save-suggestion">
                        <SelectValue placeholder="Selecciona una colección" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DEFAULT_COLLECTION_NAME}>{DEFAULT_COLLECTION_NAME}</SelectItem>
                        {existingCollectionNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                        <SelectItem value={CREATE_NEW_COLLECTION_VALUE}>
                          <div className="flex items-center">
                            <PlusCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                            Crear nueva colección...
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {showNewCollectionInputForSave && (
                    <div className="space-y-1">
                      <Label htmlFor="new-collection-name-save-suggestion">Nombre de Nueva Colección</Label>
                      <Input
                        id="new-collection-name-save-suggestion"
                        value={newCollectionNameInputForSave}
                        onChange={(e) => setNewCollectionNameInputForSave(e.target.value)}
                        placeholder="Ej: Looks de Verano"
                        disabled={isSavingOutfit}
                      />
                    </div>
                  )}
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

