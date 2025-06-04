
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import type { ClothingItem } from "@/types";

interface SelectItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  allItems: ClothingItem[]; // Todas las prendas del armario
  selectedItemIds: string[];
  onItemToggle: (itemId: string) => void;
}

export function SelectItemsDialog({
  open,
  onOpenChange,
  categoryName,
  allItems,
  selectedItemIds,
  onItemToggle,
}: SelectItemsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const itemsInCategory = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allItems.filter(
      (item) =>
        item.type === categoryName &&
        (item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.color.toLowerCase().includes(lowerSearchTerm) ||
          item.fabric.toLowerCase().includes(lowerSearchTerm))
    );
  }, [allItems, categoryName, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Prendas: {categoryName}</DialogTitle>
          <DialogDescription>
            Elige las prendas de la categoría "{categoryName}" para tu atuendo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex-grow flex flex-col overflow-hidden">
          <div className="mb-4">
            <Label htmlFor="search-items-dialog" className="sr-only">Buscar en {categoryName}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-items-dialog"
                placeholder={`Buscar en ${categoryName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {itemsInCategory.length > 0 ? (
            <ScrollArea className="flex-grow border rounded-md min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
                {itemsInCategory.map((item) => {
                  const checkboxId = `checkbox-dialog-item-${item.id}`;
                  return (
                    <div
                      key={item.id}
                      className="relative p-2 border rounded-md hover:shadow-md flex flex-col items-center gap-2 bg-background hover:bg-card transition-all"
                    >
                      <label htmlFor={checkboxId} className="absolute top-2 right-2 z-10 cursor-pointer">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedItemIds.includes(item.id)}
                          onCheckedChange={() => onItemToggle(item.id)}
                          className="h-5 w-5"
                          aria-labelledby={`item-label-dialog-${item.id}`}
                        />
                      </label>
                      <label htmlFor={checkboxId} className="w-full aspect-[3/4] relative rounded overflow-hidden cursor-pointer block">
                        <Image
                          src={item.imageUrl || "https://placehold.co/150x200.png?text=Prenda"}
                          alt={item.name}
                          layout="fill"
                          objectFit="cover"
                          data-ai-hint="clothing item"
                        />
                      </label>
                      <label htmlFor={checkboxId} id={`item-label-dialog-${item.id}`} className="text-xs text-center truncate w-full font-medium cursor-pointer">
                        {item.name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-grow flex items-center justify-center text-muted-foreground border rounded-md">
              <p>
                {searchTerm
                  ? `No hay prendas en "${categoryName}" que coincidan con tu búsqueda.`
                  : `No hay prendas en la categoría "${categoryName}".`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button">Hecho</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
