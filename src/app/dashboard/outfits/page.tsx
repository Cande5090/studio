
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { PlusCircle, Trash2, Edit3, Eye, ListPlus, FolderOpen } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const DEFAULT_COLLECTION_NAME = "General";

interface GroupedOutfits {
  collectionName: string;
  outfits: OutfitWithItems[];
}

export default function OutfitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [allOutfits, setAllOutfits] = useState<OutfitWithItems[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<OutfitWithItems | null>(null);
  const [outfitToDelete, setOutfitToDelete] = useState<OutfitWithItems | null>(null);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

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
        orderBy("createdAt", "desc") // Ordenar por fecha de creación para consistencia
      );

      const unsubscribe = onSnapshot(outfitsQuery, async (snapshot) => {
        const outfitsData: OutfitWithItems[] = await Promise.all(
          snapshot.docs.map(async (outfitDoc) => {
            const outfitData = outfitDoc.data();
            const itemIds = outfitData.itemIds || [];
            
            const itemsForOutfit: ClothingItem[] = wardrobe.filter(item => itemIds.includes(item.id));

            return {
              id: outfitDoc.id,
              userId: outfitData.userId,
              name: outfitData.name,
              itemIds: itemIds,
              items: itemsForOutfit,
              collectionName: outfitData.collectionName || DEFAULT_COLLECTION_NAME,
              createdAt: (outfitData.createdAt as Timestamp)?.toDate ? (outfitData.createdAt as Timestamp).toDate() : new Date(),
              description: outfitData.description || "",
            } as OutfitWithItems;
          })
        );
        setAllOutfits(outfitsData);
        setIsLoadingOutfits(false);
      }, (error) => {
        console.error("Error fetching outfits:", error);
        toast({ title: "Error", description: "No se pudieron cargar los atuendos.", variant: "destructive"});
        setIsLoadingOutfits(false);
      });
      return () => unsubscribe();
    } else {
      setAllOutfits([]);
      setIsLoadingOutfits(false);
    }
  }, [user, wardrobe, toast]);

  const groupedOutfits = useMemo(() => {
    const groups: Record<string, OutfitWithItems[]> = {};
    allOutfits.forEach(outfit => {
      const collectionKey = outfit.collectionName || DEFAULT_COLLECTION_NAME;
      if (!groups[collectionKey]) {
        groups[collectionKey] = [];
      }
      groups[collectionKey].push(outfit);
    });

    // Ordenar colecciones, por ejemplo, "General" primero, luego alfabéticamente
    return Object.entries(groups)
      .map(([collectionName, outfits]) => ({ collectionName, outfits }))
      .sort((a, b) => {
        if (a.collectionName === DEFAULT_COLLECTION_NAME) return -1;
        if (b.collectionName === DEFAULT_COLLECTION_NAME) return 1;
        return a.collectionName.localeCompare(b.collectionName);
      });
  }, [allOutfits]);

  const existingCollectionNames = useMemo(() => {
    const names = new Set(allOutfits.map(outfit => outfit.collectionName || DEFAULT_COLLECTION_NAME));
    return Array.from(names).sort((a,b) => {
        if (a === DEFAULT_COLLECTION_NAME) return -1;
        if (b === DEFAULT_COLLECTION_NAME) return 1;
        return a.localeCompare(b);
    });
  }, [allOutfits]);

  useEffect(() => {
    // Abrir todos los acordeones por defecto cuando los grupos cambian
    if (groupedOutfits.length > 0 && openAccordionItems.length === 0) { // Abrir solo si no hay ninguno abierto
      setOpenAccordionItems(groupedOutfits.map(g => g.collectionName));
    }
  }, [groupedOutfits, openAccordionItems.length]);


  const handleFormSaved = () => {
    setIsFormOpen(false);
    setEditingOutfit(null);
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
    } catch (error: any)
 {
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
              {editingOutfit ? "Modifica los detalles de tu atuendo." : "Nombra tu atuendo, asígnale una colección y selecciona prendas de tu guardarropa."}
            </DialogDescription>
          </DialogHeader>
          {isFormOpen && ( // Renderizar solo cuando esté abierto para que las props se pasen correctamente
            <CreateOutfitForm
              setOpen={setIsFormOpen}
              wardrobeItems={wardrobe}
              onOutfitSaved={handleFormSaved}
              existingOutfit={editingOutfit}
              existingCollectionNames={existingCollectionNames}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!outfitToDelete} onOpenChange={() => setOutfitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el atuendo &quot;{outfitToDelete?.name}&quot; de la colección &quot;{outfitToDelete?.collectionName}&quot;. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOutfit}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
         <div className="space-y-4">
          {Array.from({length: 2}).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-10 w-1/3 mb-2" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({length: 3}).map((_, j) => <Skeleton key={j} className="h-72 w-full rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && allOutfits.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card/50">
          <ListPlus className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No has creado ningún atuendo</h2>
          <p className="text-muted-foreground mb-6">
            Empieza creando tu primer atuendo para diferentes ocasiones y organízalos en colecciones.
          </p>
          <Button onClick={() => handleOpenForm()} size="lg" disabled={isLoadingWardrobe}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear mi primer atuendo
          </Button>
        </div>
      )}

      {!isLoading && allOutfits.length > 0 && (
        <Accordion 
            type="multiple" 
            className="w-full space-y-4"
            value={openAccordionItems}
            onValueChange={setOpenAccordionItems}
        >
          {groupedOutfits.map(({ collectionName, outfits: outfitsInCollection }) => (
            <AccordionItem value={collectionName} key={collectionName} className="border bg-card shadow-sm rounded-lg">
              <AccordionTrigger className="px-6 py-4 text-xl font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-6 w-6 text-primary" />
                  {collectionName} ({outfitsInCollection.length} atuendo(s))
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0">
                {outfitsInCollection.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {outfitsInCollection.map((outfit) => (
                      <OutfitDisplayCard 
                        key={outfit.id} 
                        outfit={outfit} 
                        onEdit={() => handleOpenForm(outfit)}
                        onDelete={() => setOutfitToDelete(outfit)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay atuendos en esta colección.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
