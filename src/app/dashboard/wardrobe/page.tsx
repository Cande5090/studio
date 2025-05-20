
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from "firebase/firestore";
import { PlusCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem } from "@/types";
import { ClothingCard } from "@/components/wardrobe/ClothingCard";
import { AddClothingItemForm } from "@/components/wardrobe/AddClothingItemForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ShirtIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-shirt", className)}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
  </svg>
);

const seasonOrder = ["Primavera", "Verano", "Otoño", "Invierno", "Todo el año"];
const getSeasonSortValue = (season: string) => {
  const index = seasonOrder.indexOf(season);
  return index === -1 ? seasonOrder.length : index; // Items not in order go last
};

export default function WardrobePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allClothingItems, setAllClothingItems] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const q = query(
        collection(db, "clothingItems"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc") // Firestore sorts by createdAt desc by default
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: ClothingItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          items.push({ id: doc.id, ...data, createdAt } as ClothingItem);
        });
        setAllClothingItems(items);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching clothing items:", error);
        setIsLoading(false);
        toast({
          title: "Error al cargar armario",
          description: "No se pudieron cargar tus prendas. Intenta de nuevo más tarde.",
          variant: "destructive",
        });
      });
      return () => unsubscribe();
    }
  }, [user, toast]);

  const filteredAndSortedItems = useMemo(() => {
    let processedItems = [...allClothingItems];

    // Filter by searchTerm
    if (searchTerm.trim() !== "") {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedItems = processedItems.filter(item =>
        item.name.toLowerCase().includes(lowerSearchTerm) ||
        item.type.toLowerCase().includes(lowerSearchTerm) ||
        item.color.toLowerCase().includes(lowerSearchTerm) ||
        item.fabric.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Sort
    switch (sortBy) {
      case "createdAt_asc":
        processedItems.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "name_asc":
        processedItems.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        processedItems.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "type_asc":
        processedItems.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "type_desc":
        processedItems.sort((a, b) => b.type.localeCompare(a.type));
        break;
      case "season_asc":
        processedItems.sort((a, b) => getSeasonSortValue(a.season) - getSeasonSortValue(b.season));
        break;
      case "season_desc":
        processedItems.sort((a, b) => getSeasonSortValue(b.season) - getSeasonSortValue(a.season));
        break;
      case "createdAt_desc":
      default:
        // Already sorted by Firestore query if this is the default
        // If not default, it relies on the initial Firestore sort
        break;
    }
    return processedItems;
  }, [allClothingItems, searchTerm, sortBy]);


  const handleDeleteItem = async (itemId: string) => {
    if (!user) {
      toast({ title: "Error", description: "Debes estar autenticado.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, "clothingItems", itemId));
      toast({ title: "Prenda eliminada", description: "La prenda ha sido eliminada de tu armario." });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ title: "Error al eliminar", description: "No se pudo eliminar la prenda.", variant: "destructive" });
    }
  };

  const handleOpenAddDialog = () => {
    setFormMode('add');
    setEditingItem(null);
    setIsFormDialogOpen(true);
  };

  const handleOpenEditDialog = (item: ClothingItem) => {
    setFormMode('edit');
    setEditingItem(item);
    setIsFormDialogOpen(true);
  };

  const handleItemSaved = () => {
    // Firestore onSnapshot will update the list automatically
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Mi Armario</h1>
        <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Prenda
        </Button>
      </div>

      <div className="mb-8 p-4 border rounded-lg bg-card shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="search-wardrobe" className="text-sm font-medium">Buscar en mi armario</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-wardrobe"
                type="text"
                placeholder="Buscar por nombre, tipo, color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sort-wardrobe" className="text-sm font-medium">Ordenar por</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-wardrobe" className="w-full mt-1">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt_desc">Más recientes</SelectItem>
                <SelectItem value="createdAt_asc">Más antiguas</SelectItem>
                <SelectItem value="name_asc">Nombre (A-Z)</SelectItem>
                <SelectItem value="name_desc">Nombre (Z-A)</SelectItem>
                <SelectItem value="type_asc">Tipo (A-Z)</SelectItem>
                <SelectItem value="type_desc">Tipo (Z-A)</SelectItem>
                <SelectItem value="season_asc">Estación (Primavera - Todo el año)</SelectItem>
                <SelectItem value="season_desc">Estación (Todo el año - Primavera)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{formMode === 'edit' ? 'Editar Prenda' : 'Añadir Nueva Prenda'}</DialogTitle>
            <DialogDescription>
              {formMode === 'edit' ? 'Modifica los detalles de tu prenda.' : 'Sube una foto y completa los detalles de tu prenda. Puedes usar la IA para autocompletar.'}
            </DialogDescription>
          </DialogHeader>
          <AddClothingItemForm 
            key={formMode === 'edit' && editingItem ? editingItem.id : 'add-new-item'}
            setOpen={setIsFormDialogOpen} 
            itemToEdit={formMode === 'edit' ? editingItem : undefined}
            onItemSaved={handleItemSaved}
          />
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && allClothingItems.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card/50">
          <ShirtIcon className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Tu armario está vacío</h2>
          <p className="text-muted-foreground mb-6">
            Empieza añadiendo prendas para organizar tu estilo.
          </p>
          <Button onClick={handleOpenAddDialog} size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            Añadir mi primera prenda
          </Button>
        </div>
      )}
      
      {!isLoading && allClothingItems.length > 0 && filteredAndSortedItems.length === 0 && (
         <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card/50">
          <Search className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No se encontraron prendas</h2>
          <p className="text-muted-foreground">
            Intenta ajustar tu búsqueda o los filtros de ordenamiento.
          </p>
        </div>
      )}

      {!isLoading && filteredAndSortedItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSortedItems.map((item) => (
            <ClothingCard key={item.id} item={item} onDeleteItem={handleDeleteItem} onEditItem={handleOpenEditDialog} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[250px] w-full rounded-xl" />
      <div className="space-y-2 p-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

