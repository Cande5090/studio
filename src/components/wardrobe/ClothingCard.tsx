
import Image from "next/image";
import type { ClothingItem } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Palette, Snowflake, Sun, Droplets, Trash2, Pencil } from "lucide-react"; // Added Trash2, Pencil
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
import { useState } from "react";

interface ClothingCardProps {
  item: ClothingItem;
  onDeleteItem: (itemId: string) => Promise<void>;
  onEditItem: (item: ClothingItem) => void; // Placeholder for edit
}

export function ClothingCard({ item, onDeleteItem, onEditItem }: ClothingCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    await onDeleteItem(item.id);
    setIsDeleteDialogOpen(false); // Close dialog after deletion
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="aspect-square w-full relative overflow-hidden">
          <Image
            src={item.imageUrl || "https://placehold.co/300x300.png?text=Prenda"}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="clothing item"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-2 truncate" title={item.name}>{item.name}</CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span>{item.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <span>{item.color}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.season.toLowerCase().includes("invierno") || item.season.toLowerCase().includes("otoño") ? <Snowflake className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            <span>{item.season}</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <span>{item.fabric}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => onEditItem(item)} disabled> {/* Edit button disabled for now */}
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Eliminar</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la prenda &quot;{item.name}&quot; de tu armario.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
