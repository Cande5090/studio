
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { PlusCircle, Trash2, Edit3, Eye, ListPlus } from "lucide-react"; // Se eliminó LayoutGrid
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem, OutfitWithItems } from "@/types";
import { CreateOutfitForm } from "@/components/outfits/CreateOutfitForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { OutfitDisplayCard } from "@/components/outfits/OutfitDisplayCard";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function OutfitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<OutfitWithItems | null>(null);
  const [outfitToDelete, setOutfitToDelete] = useState<OutfitWithItems | null>(null);

  useEffect(() => {
    async function fetchWardrobe() {
      if (user) {
        setIsLoadingWardrobe(true);
        const q = query(
          collection(db, "clothingItems"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const items: ClothingItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              ...data,
              createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
            } as ClothingItem);
          });
          setWardrobe(items);
          setIsLoadingWardrobe(false);
        }, (error) => {
          console.error("Error fetching wardrobe:", error);
          toast({ title: "Error", description: "No se pudo cargar el guardarropa.", variant: "destructive" });
          setIsLoadingWardrobe(false);
        });
        return () => unsubscribe();
      } else {
        setWardrobe([]);
        setIsLoadingWardrobe(false);
      }
    }
    fetchWardrobe();
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      setIsLoadingOutfits(true);
      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(outfitsQuery, async (snapshot) => {
        const outfitsData: OutfitWithItems[] = await Promise.all(
          snapshot.docs.map(async (outfitDoc) => {
            const outfitData = outfitDoc.data();
            const itemIds = outfitData.itemIds || [];
            
            // Efficiently fetch only the items needed for this outfit
            const itemsForOutfit: ClothingItem[] = wardrobe.filter(item => itemIds.includes(item.id));

            return {
              id: outfitDoc.id,
              userId: outfitData.userId,
              name: outfitData.name,
              itemIds: itemIds,
              items: itemsForOutfit, // Populate items
              createdAt: (outfitData.createdAt as Timestamp)?.toDate ? (outfitData.createdAt as Timestamp).toDate() : new Date(),
              description: outfitData.description || "",
            } as OutfitWithItems;
          })
        );
        setOutfits(outfitsData);
        setIsLoadingOutfits(false);
      }, (error) => {
        console.error("Error fetching outfits:", error);
        toast({ title: "Error", description: "No se pudieron cargar los atuendos.", variant: "destructive"});
        setIsLoadingOutfits(false);
      });
      return () => unsubscribe();
    } else {
      setOutfits([]);
      setIsLoadingOutfits(false);
    }
  }, [user, wardrobe, toast]); // Add wardrobe to dependencies

  const handleFormSaved = () => {
    setIsFormOpen(false);
    setEditingOutfit(null);
    // Outfits list will refresh due to onSnapshot
  };

  const handleOpenForm = (outfitToEdit: OutfitWithItems | null = null) => {
    setEditingOutfit(outfitToEdit);
    setIsFormOpen(true);
  };
  
  const handleDeleteOutfit = async () => {
    if (!outfitToDelete) return;
    try {
      await deleteDoc(doc(db, "outfits", outfitToDelete.id));
      toast({ title: "Atuendo Eliminado", description: `"${outfitToDelete.name}" ha sido eliminado.` });
      setOutfitToDelete(null);
    } catch (error: any) {
      console.error("Error deleting outfit:", error);
      const errorMessage = error.code ? `Código: ${error.code}. Mensaje: ${error.message}` : error.message || "Ocurrió un error desconocido.";
      toast({ 
        title: "Error al Eliminar Atuendo", 
        description: `No se pudo eliminar: ${errorMessage}. Revisa la consola (F12).`, 
        variant: "destructive",
        duration: 9000
      });
    }
  };


  const isLoading = isLoadingWardrobe || isLoadingOutfits;

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Mis Atuendos</h1>
        <Button onClick={() => handleOpenForm()} disabled={isLoadingWardrobe}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Crear Atuendo
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingOutfit(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingOutfit ? "Editar Atuendo" : "Crear Nuevo Atuendo"}</DialogTitle>
            <DialogDescription>
              {editingOutfit ? "Modifica el nombre y las prendas de tu atuendo." : "Nombra tu atuendo y selecciona prendas de tu guardarropa."}
            </DialogDescription>
          </DialogHeader>
          {isFormOpen && ( // Ensure wardrobe is loaded before rendering form
            <CreateOutfitForm
              setOpen={setIsFormOpen}
              wardrobeItems={wardrobe}
              onOutfitSaved={handleFormSaved}
              existingOutfit={editingOutfit}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!outfitToDelete} onOpenChange={() => setOutfitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el atuendo &quot;{outfitToDelete?.name}&quot;. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOutfit}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {isLoading && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-lg" />)}
        </div>
      )}

      {!isLoading && outfits.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card/50">
          <ListPlus className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No has creado ningún atuendo</h2>
          <p className="text-muted-foreground mb-6">
            Empieza creando tu primer atuendo para diferentes ocasiones.
          </p>
          <Button onClick={() => handleOpenForm()} size="lg" disabled={isLoadingWardrobe}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear mi primer atuendo
          </Button>
        </div>
      )}

      {!isLoading && outfits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map((outfit) => (
            <OutfitDisplayCard 
              key={outfit.id} 
              outfit={outfit} 
              onEdit={() => handleOpenForm(outfit)}
              onDelete={() => setOutfitToDelete(outfit)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
