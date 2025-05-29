
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { PlusCircle, Trash2, Pencil, Loader2, FolderOpen } from "lucide-react"; // Removed LayoutGrid as it's not used

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem, OutfitWithItems } from "@/types";
import { CreateOutfitForm } from "@/components/outfits/CreateOutfitForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<{ oldName: string; newName: string } | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

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
        const currentCollectionNames = Array.from(new Set(outfitsData.map(o => o.collectionName || DEFAULT_COLLECTION_NAME)));
        setOpenAccordionItems(prevOpen => {
          const stillExistingOpen = prevOpen.filter(name => currentCollectionNames.includes(name));
          // Only add new collections if they weren't previously there; don't re-add if user closed one.
          const newlyAddedCollections = currentCollectionNames.filter(name => !allOutfits.find(o => o.collectionName === name) && !prevOpen.includes(name));
          return [...stillExistingOpen, ...newlyAddedCollections];
        });
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

    return Object.entries(groups)
      .map(([collectionName, outfits]) => ({ collectionName, outfits }))
      .sort((a, b) => {
        if (a.collectionName === DEFAULT_COLLECTION_NAME) return -1;
        if (b.collectionName === DEFAULT_COLLECTION_NAME) return 1;
        return a.collectionName.localeCompare(b.collectionName);
      });
  }, [allOutfits]);
  
  const existingCollectionNames = useMemo(() => 
    Array.from(new Set(allOutfits.map(o => o.collectionName || DEFAULT_COLLECTION_NAME))).sort((a, b) => {
        if (a === DEFAULT_COLLECTION_NAME) return -1;
        if (b === DEFAULT_COLLECTION_NAME) return 1;
        return a.localeCompare(b);
    }), [allOutfits]);


  useEffect(() => {
    if (groupedOutfits.length > 0 && openAccordionItems.length === 0 && !isLoadingOutfits && !isFormOpen) { 
      setOpenAccordionItems(groupedOutfits.map(g => g.collectionName));
    }
  }, [groupedOutfits, openAccordionItems.length, isLoadingOutfits, isFormOpen]);


  const handleFormSaved = () => {
    setIsFormOpen(false);
    setEditingOutfit(null);
  };

  const handleOpenForm = (outfitToEdit: OutfitWithItems | null = null) => {
    setEditingOutfit(outfitToEdit);
    setIsFormOpen(true);
  };
  
  const handleDeleteOutfit = async () => {
    if (!outfitToDelete || !user) return;
    try {
      await deleteDoc(doc(db, "outfits", outfitToDelete.id));
      toast({ title: "Atuendo Eliminado", description: `"${outfitToDelete.name}" ha sido eliminado.` });
      setOutfitToDelete(null);
    } catch (error: any) {
      console.error("Error deleting outfit:", error);
      const errorMessage = error.message || "Ocurrió un error desconocido.";
      toast({ 
        title: "Error al Eliminar Atuendo", 
        description: `No se pudo eliminar: ${errorMessage}.`, 
        variant: "destructive",
      });
    }
  };

  const openEditCollectionDialog = (collectionName: string) => {
    if (collectionName === DEFAULT_COLLECTION_NAME) {
      toast({ title: "Información", description: `La colección "${DEFAULT_COLLECTION_NAME}" no se puede editar ni eliminar.`});
      return;
    }
    setCollectionToEdit({ oldName: collectionName, newName: collectionName });
    setIsEditingCollection(true);
  };

  const handleUpdateCollectionName = async () => {
    if (!collectionToEdit || !user || isBatchUpdating) return;
    const { oldName, newName } = collectionToEdit;

    if (!newName.trim() || newName.trim() === DEFAULT_COLLECTION_NAME) {
      toast({ title: "Nombre Inválido", description: `El nuevo nombre de la colección no puede estar vacío ni ser "${DEFAULT_COLLECTION_NAME}".`, variant: "destructive" });
      return;
    }
    if (newName.trim() === oldName) {
      setIsEditingCollection(false);
      setCollectionToEdit(null);
      return;
    }

    setIsBatchUpdating(true);
    try {
      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", user.uid),
        where("collectionName", "==", oldName)
      );
      const querySnapshot = await getDocs(outfitsQuery);
      
      if (querySnapshot.empty) {
        toast({ title: "Información", description: `No se encontraron atuendos en la colección "${oldName}".` });
        setIsEditingCollection(false);
        setCollectionToEdit(null);
        setIsBatchUpdating(false);
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach((outfitDoc) => {
        batch.update(doc(db, "outfits", outfitDoc.id), { collectionName: newName.trim() });
      });
      await batch.commit();

      toast({ title: "Colección Actualizada", description: `La colección "${oldName}" ha sido renombrada a "${newName.trim()}".` });
      
      setOpenAccordionItems(prev => prev.map(name => name === oldName ? newName.trim() : name).filter((value, index, self) => self.indexOf(value) === index));

    } catch (error: any) {
      console.error("Error updating collection name:", error);
      toast({ title: "Error", description: `No se pudo actualizar la colección: ${error.message}`, variant: "destructive" });
    } finally {
      setIsEditingCollection(false);
      setCollectionToEdit(null);
      setIsBatchUpdating(false);
    }
  };

  const openDeleteCollectionDialog = (collectionName: string) => {
     if (collectionName === DEFAULT_COLLECTION_NAME) {
      toast({ title: "Información", description: `La colección "${DEFAULT_COLLECTION_NAME}" no se puede editar ni eliminar.`});
      return;
    }
    setCollectionToDelete(collectionName);
    setIsDeletingCollection(true);
  };

  const handleDeleteCollectionAndReassignOutfits = async () => {
    if (!collectionToDelete || !user || isBatchUpdating) return;
    setIsBatchUpdating(true);
    try {
      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", user.uid),
        where("collectionName", "==", collectionToDelete)
      );
      const querySnapshot = await getDocs(outfitsQuery);

      if (querySnapshot.empty) {
        toast({ title: "Información", description: `La colección "${collectionToDelete}" ya estaba vacía o no existía.` });
        setOpenAccordionItems(prev => prev.filter(name => name !== collectionToDelete));
        setIsDeletingCollection(false);
        setCollectionToDelete(null);
        setIsBatchUpdating(false);
        return;
      }
      
      const batch = writeBatch(db);
      querySnapshot.forEach((outfitDoc) => {
        batch.update(doc(db, "outfits", outfitDoc.id), { collectionName: DEFAULT_COLLECTION_NAME });
      });
      await batch.commit();

      toast({ title: "Colección Eliminada", description: `La colección "${collectionToDelete}" ha sido eliminada. Sus atuendos se movieron a "${DEFAULT_COLLECTION_NAME}".` });
      setOpenAccordionItems(prev => {
        const updated = prev.filter(name => name !== collectionToDelete);
        if (!updated.includes(DEFAULT_COLLECTION_NAME)) {
          updated.push(DEFAULT_COLLECTION_NAME);
        }
        return updated;
      });

    } catch (error: any) {
      console.error("Error deleting collection:", error);
      toast({ title: "Error", description: `No se pudo eliminar la colección: ${error.message}`, variant: "destructive" });
    } finally {
      setIsDeletingCollection(false);
      setCollectionToDelete(null);
      setIsBatchUpdating(false);
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
          {isFormOpen && ( 
            <CreateOutfitForm
              key={editingOutfit ? `edit-${editingOutfit.id}` : 'create-new'}
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
            <AlertDialogAction onClick={handleDeleteOutfit} className="bg-destructive hover:bg-destructive/90">Eliminar Atuendo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditingCollection} onOpenChange={(open) => {
        if (!open) {
          setIsEditingCollection(false);
          setCollectionToEdit(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nombre de Colección</DialogTitle>
            <DialogDescription>
              Renombra la colección &quot;{collectionToEdit?.oldName}&quot;. Esto actualizará todos los atuendos en esta colección.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCollectionName" className="text-right col-span-1">
                Nuevo Nombre
              </Label>
              <Input
                id="newCollectionName"
                value={collectionToEdit?.newName || ""}
                onChange={(e) => setCollectionToEdit(prev => prev ? { ...prev, newName: e.target.value } : null)}
                className="col-span-3"
                placeholder="Escribe el nuevo nombre"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditingCollection(false); setCollectionToEdit(null); }} disabled={isBatchUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCollectionName} disabled={isBatchUpdating || !collectionToEdit?.newName.trim() || collectionToEdit.newName.trim() === DEFAULT_COLLECTION_NAME}>
              {isBatchUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeletingCollection} onOpenChange={(open) => {
        if (!open) {
          setIsDeletingCollection(false);
          setCollectionToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Colección?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la colección &quot;{collectionToDelete}&quot;. 
              Los atuendos en esta colección serán movidos a la colección &quot;{DEFAULT_COLLECTION_NAME}&quot;.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollectionAndReassignOutfits} disabled={isBatchUpdating} className="bg-destructive hover:bg-destructive/90">
              {isBatchUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar Colección
            </AlertDialogAction>
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
          <FolderOpen className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
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
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-primary" />
                    {collectionName} ({outfitsInCollection.length} atuendo(s))
                    </div>
                    {collectionName !== DEFAULT_COLLECTION_NAME && (
                        <div className="flex items-center gap-2 pr-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); openEditCollectionDialog(collectionName); }}
                                className="hover:bg-accent/50 h-8 w-8"
                                disabled={isBatchUpdating}
                                aria-label={`Editar colección ${collectionName}`}
                                asChild // Fix: Use asChild to prevent button nesting
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); openDeleteCollectionDialog(collectionName); }}
                                className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                                disabled={isBatchUpdating}
                                aria-label={`Eliminar colección ${collectionName}`}
                                asChild // Fix: Use asChild to prevent button nesting
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
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
