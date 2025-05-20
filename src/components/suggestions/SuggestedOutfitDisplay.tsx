
import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText } from "lucide-react";

interface SuggestedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput | null;
}

export function SuggestedOutfitDisplay({ suggestion }: SuggestedOutfitDisplayProps) {
  if (!suggestion || (!suggestion.outfitSuggestion && !suggestion.reasoning)) {
    return (
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Sugerencia de Atuendo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La IA está procesando tu solicitud o no pudo generar una sugerencia esta vez. Inténtalo de nuevo o con una descripción diferente.
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
            <CardDescription>No se pudo generar una sugerencia detallada.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {hasOutfitItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestion.outfitSuggestion!.map((item, index) => {
              const itemType = item.type || "Prenda";
              const itemColor = item.color || "Color no especificado";
              const altText = `${itemType} - ${itemColor}`;
              const titleText = `${itemType} (${itemColor})`;

              return (
                <div key={index} className="flex flex-col items-center space-y-2 p-2 border rounded-lg bg-muted/30">
                  <div className="relative w-full aspect-square rounded-md overflow-hidden">
                   <Image
                      src={item.imageUrl || "https://placehold.co/200x200.png?text=Prenda"} 
                      alt={altText}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint="clothing item"
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={titleText}>{itemType}</p>
                  {item.color && <p className="text-xs text-muted-foreground text-center">{itemColor}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            La IA no especificó prendas para esta sugerencia.
          </p>
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
        {!suggestion.reasoning && (
           <p className="text-sm text-muted-foreground pt-4 border-t">
            La IA no proporcionó una explicación para esta sugerencia.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
