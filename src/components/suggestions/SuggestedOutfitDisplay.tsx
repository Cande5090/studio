
"use client";

import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import type { ClothingItem } from "@/types";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText, Shirt } from "lucide-react";
import { useMemo } from "react";

interface SuggestedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput | null;
  wardrobe: ClothingItem[]; 
}

export function SuggestedOutfitDisplay({ suggestion, wardrobe }: SuggestedOutfitDisplayProps) {
  const wardrobeMap = useMemo(() => {
    return new Map(wardrobe.map(item => [item.id, item]));
  }, [wardrobe]);

  if (!suggestion) {
    // Este estado se maneja en la página principal (SuggestionsPage)
    // cuando !isSuggesting && !suggestion
    return null; 
  }
  
  const hasOutfitItems = suggestion.outfitSuggestion && suggestion.outfitSuggestion.length > 0;

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
              // El ID es obligatorio en SuggestedItemSchema según el prompt
              const originalItem = suggestedItem.id ? wardrobeMap.get(suggestedItem.id) : undefined;

              const displayType = suggestedItem.type || originalItem?.type || "Prenda";
              const displayColor = suggestedItem.color || originalItem?.color || "";
              
              let displayImageUrl = "https://placehold.co/200x250.png?text=Prenda";
              let aiHint = "clothing item";

              if (originalItem) {
                if (originalItem.imageUrl && originalItem.imageUrl.startsWith('data:image')) {
                  displayImageUrl = originalItem.imageUrl;
                } else if (originalItem.imageUrl) { 
                  // Si no es Data URI, podría ser una URL externa o un placeholder diferente.
                  // Por ahora, si no es data URI, usamos el placeholder general.
                  // En un futuro, podríamos intentar usar originalItem.imageUrl si es una URL https válida.
                }
                aiHint = originalItem.type.toLowerCase() || "clothing item";
              }


              const itemName = `${displayType} ${displayColor}`.trim();
              const altText = itemName || "Prenda sugerida";
              const titleText = itemName || "Prenda sugerida";
              
              return (
                <div key={originalItem?.id || `suggested-${index}`} className="flex flex-col items-center space-y-2 p-2 border rounded-lg bg-muted/30">
                  <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
                   <Image
                      src={displayImageUrl}
                      alt={altText}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={aiHint}
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/200x250.png?text=Error";
                        e.currentTarget.alt = "Error al cargar imagen";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={titleText}>
                    {itemName || "Prenda"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
           suggestion.reasoning ? ( 
            <p className="text-sm text-muted-foreground">
              {/* El razonamiento se mostrará abajo, este es un placeholder si no hay prendas Y hay razonamiento */}
            </p>
           ) : ( 
            <div className="text-center py-8">
                <Shirt className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                La IA está buscando o no pudo encontrar un atuendo.
                </p>
            </div>
           )
        )}

        {suggestion.reasoning && (
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary"/>
              Explicación de la IA:
            </h3>
            <ScrollArea className="h-24 rounded-md border p-3 text-sm bg-muted/20">
              <p className="whitespace-pre-wrap">{suggestion.reasoning}</p>
            </ScrollArea>
          </div>
        )}
        {!suggestion.reasoning && hasOutfitItems && ( 
           <p className="text-sm text-muted-foreground pt-4 border-t">
            La IA no proporcionó una explicación para esta sugerencia.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
