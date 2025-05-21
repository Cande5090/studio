
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
              // Asegurarse de que suggestedItem y suggestedItem.id existen
              const originalItemId = suggestedItem?.id;
              const originalItem = originalItemId ? wardrobeMap.get(originalItemId) : undefined;

              // Determinar el tipo y color a mostrar
              // Prioridad: Prenda Original -> IA -> "Prenda" / ""
              let displayType = originalItem?.type || suggestedItem.type || "Prenda";
              let displayColor = originalItem?.color || suggestedItem.color || "";
              
              let displayImageUrl = "https://placehold.co/200x250.png?text=No+Disp.";
              let aiHint = "clothing item";

              if (originalItem) {
                // Solo usar Data URIs o URLs de placehold.co válidas
                if (originalItem.imageUrl && (originalItem.imageUrl.startsWith('data:image') || originalItem.imageUrl.startsWith('https://placehold.co'))) {
                  displayImageUrl = originalItem.imageUrl;
                }
                // Actualizar aiHint basado en el tipo real de la prenda si está disponible
                if (originalItem.type && originalItem.type.toLowerCase() !== "otro") {
                    aiHint = originalItem.type.split(' ')[0].toLowerCase();
                }
                // Usar el nombre del item original como fallback para el nombre a mostrar
                displayType = originalItem.type || displayType;
                displayColor = originalItem.color || displayColor;

              } else if (suggestedItem.id) { // Si no hay originalItem pero sí un ID de la IA (la IA alucinó un ID)
                displayImageUrl = `https://placehold.co/200x250.png?text=ID:${suggestedItem.id.substring(0,4)}?`;
                displayType = suggestedItem.type || "Prenda (ID desconocido)";
                displayColor = suggestedItem.color || "";
              }


              const itemName = `${displayType} ${displayColor}`.trim() || (originalItem?.name) || "Prenda";
              const altText = itemName || `Prenda sugerida ${index + 1}`;
              const titleText = itemName || `Prenda sugerida ${index + 1}`;
              
              return (
                <div key={originalItemId || `suggested-placeholder-${index}`} className="flex flex-col items-center space-y-2 p-2 border rounded-lg bg-muted/30">
                  <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
                   <Image
                      src={displayImageUrl}
                      alt={altText}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={aiHint} 
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/200x250.png?text=ErrorImg";
                        e.currentTarget.alt = "Error al cargar imagen";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={titleText}>
                    {itemName}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
           suggestion.reasoning ? ( 
            <p className="text-sm text-muted-foreground">
              {/* El razonamiento se mostrará abajo. Este texto es si no hay prendas pero SÍ hay razonamiento. */}
            </p>
           ) : ( 
            <div className="text-center py-8">
                <Shirt className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  La IA no pudo generar un atuendo esta vez.
                </p>
            </div>
           )
        )}

        {/* Mostrar el razonamiento siempre que exista */}
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
      </CardContent>
    </Card>
  );
}

