
import type { SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText, Shirt } from "lucide-react"; // Added Shirt as a fallback icon

interface SuggestedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput | null;
}

export function SuggestedOutfitDisplay({ suggestion }: SuggestedOutfitDisplayProps) {
  if (!suggestion) {
    return (
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Sugerencia de Atuendo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esperando sugerencia...
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
            {suggestion.outfitSuggestion!.map((item, index) => {
              const itemType = item.type || "Prenda";
              const itemColor = item.color || ""; // Default to empty if not specified
              const itemName = item.type ? (item.color ? `${item.type} ${item.color}` : item.type) : "Prenda";
              const altText = itemName;
              const titleText = itemName;

              return (
                <div key={index} className="flex flex-col items-center space-y-2 p-2 border rounded-lg bg-muted/30">
                  <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
                   <Image
                      src={item.imageUrl || "https://placehold.co/200x250.png?text=Prenda"} 
                      alt={altText}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={item.type ? item.type.toLowerCase() : "clothing item"}
                      onError={(e) => {
                        // Fallback for broken image URLs, though placeholder should handle most
                        e.currentTarget.src = "https://placehold.co/200x250.png?text=Error";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={titleText}>
                    {itemName}
                  </p>
                  {/* Optionally, display other details like material or season if needed */}
                  {/* {item.material && <p className="text-xs text-muted-foreground text-center">Material: {item.material}</p>} */}
                  {/* {item.season && <p className="text-xs text-muted-foreground text-center">Temporada: {item.season}</p>} */}
                </div>
              );
            })}
          </div>
        ) : (
           suggestion.reasoning ? ( // If there's reasoning but no items
            <p className="text-sm text-muted-foreground">
              La IA no especificó prendas para esta sugerencia. Ver razonamiento abajo.
            </p>
           ) : ( // No items and no reasoning (yet or failed)
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
        {!suggestion.reasoning && hasOutfitItems && ( // Has items but no reasoning
           <p className="text-sm text-muted-foreground pt-4 border-t">
            La IA no proporcionó una explicación para esta sugerencia.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
