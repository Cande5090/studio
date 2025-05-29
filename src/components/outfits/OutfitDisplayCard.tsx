
"use client";

import Image from "next/image";
import type { OutfitWithItems } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trash2, Edit3, CalendarDays, Folder } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OutfitDisplayCardProps {
  outfit: OutfitWithItems;
  onEdit: (outfit: OutfitWithItems) => void;
  onDelete: (outfit: OutfitWithItems) => void;
}

const DEFAULT_COLLECTION_NAME = "General";

export function OutfitDisplayCard({ outfit, onEdit, onDelete }: OutfitDisplayCardProps) {
  const displayCollectionName = outfit.collectionName || DEFAULT_COLLECTION_NAME;
  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="truncate" title={outfit.name}>{outfit.name}</CardTitle>
        {outfit.description && <CardDescription className="truncate text-sm">{outfit.description}</CardDescription>}
        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
            <Folder className="h-3 w-3"/> 
            <span>Colección: {displayCollectionName}</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
            <CalendarDays className="h-3 w-3"/>
            Creado el {format(new Date(outfit.createdAt), "PPP", { locale: es })}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {outfit.items && outfit.items.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-3 pb-3">
              {outfit.items.map((item) => (
                <div key={item.id} className="shrink-0 w-24">
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                    <Image
                      src={item.imageUrl || "https://placehold.co/150x200.png?text=Prenda"}
                      alt={item.name}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint="clothing item"
                    />
                  </div>
                  <p className="text-xs truncate text-center mt-1" title={item.name}>{item.name}</p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">Este atuendo no tiene prendas asignadas.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => onEdit(outfit)}>
          <Edit3 className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
        <Button variant="destructive" size="icon" onClick={() => onDelete(outfit)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
