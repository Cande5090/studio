
"use client";

import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import type { ClothingItem } from "@/types"; // Import ClothingItem
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText, Shirt } from "lucide-react";
import { useMemo } from "react"; // Import useMemo

interface SuggestedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput | null;
  wardrobe: ClothingItem[]; // Add wardrobe prop
}

export function SuggestedOutfitDisplay({ suggestion, wardrobe }: SuggestedOutfitDisplayProps) {
  const wardrobeMap = useMemo(() => {
    return new Map(wardrobe.map(item => [item.id, item]));
  }, [wardrobe]);

  if (!suggestion) {
    return (
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Sugerencia de Atuendo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esperando sugerencia... Introduce una ocasión arriba y pide una sugerencia.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const hasOutfitItems = suggestion.outfitSuggestion && suggestion.outfitSuggestion.length > 0;

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Tu Atuendo Sugerido</CardTitle>
        {(hasOutfitItems || suggestion.reasoning) && (
          <CardDescription>Basado en tu armario y la ocasión especificada.</CardDescription>
        )}
         {!hasOutfitItems && !suggestion.reasoning && (
            <CardDescription>La IA no pudo generar una sugerencia detallada esta vez o está procesando.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {hasOutfitItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestion.outfitSuggestion!.map((suggestedItem, index) => {
              const originalItem = suggestedItem.id ? wardrobeMap.get(suggestedItem.id) : undefined;

              const displayImageUrl = (originalItem?.imageUrl && originalItem.imageUrl.startsWith('data:image')) 
                                      ? originalItem.imageUrl 
                                      : "https://placehold.co/200x250.png?text=Prenda";
              
              const displayType = suggestedItem.type || originalItem?.type || "Prenda";
              const displayColor = suggestedItem.color || originalItem?.color || "";
              
              const itemName = displayType + (displayColor ? ` ${displayColor}` : "");
              const altText = itemName;
              const titleText = itemName;
              const aiHint = displayType !== "Prenda" ? displayType.toLowerCase() : "clothing item";


              return (
                <div key={originalItem?.id || index} className="flex flex-col items-center space-y-2 p-2 border rounded-lg bg-muted/30">
                  <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
                   <Image
                      src={displayImageUrl}
                      alt={altText}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={aiHint}
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/200x250.png?text=Error";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={titleText}>
                    {itemName}
                  </p>
                  {/* Optionally display other details from originalItem or suggestedItem if needed */}
                  {/* <p className="text-xs text-muted-foreground">S: {suggestedItem.season || originalItem?.season}</p> */}
                  {/* <p className="text-xs text-muted-foreground">M: {suggestedItem.material || originalItem?.fabric}</p> */}
                </div>
              );
            })}
          </div>
        ) : (
           suggestion.reasoning ? ( 
            <p className="text-sm text-muted-foreground">
              La IA no especificó prendas para esta sugerencia. Ver razonamiento abajo.
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
              <p>{suggestion.reasoning}</p>
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
