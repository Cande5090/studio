
"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ClothingItem } from "@/types";

interface PreviewOutfitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: ClothingItem[];
  outfitName?: string;
}

export function PreviewOutfitDialog({
  open,
  onOpenChange,
  selectedItems,
  outfitName,
}: PreviewOutfitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa del Atuendo</DialogTitle>
          {outfitName && <DialogDescription>Nombre: {outfitName}</DialogDescription>}
        </DialogHeader>
        <div className="py-4 flex-1 min-h-0 overflow-y-auto">
          {selectedItems.length > 0 ? (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex flex-col items-center space-y-1">
                    <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden border bg-muted/20">
                      <Image
                        src={item.imageUrl || "https://placehold.co/150x200.png?text=Prenda"}
                        alt={item.name}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="clothing item"
                      />
                    </div>
                    <p className="text-xs text-center truncate w-full" title={item.name}>
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              No hay prendas seleccionadas para previsualizar.
            </p>
          )}
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    