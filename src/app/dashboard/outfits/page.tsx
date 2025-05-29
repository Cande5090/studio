
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { PlusCircle, Trash2, Pencil, Loader2, FolderOpen, FolderPlus, Search, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogTrigger,
  DialogClose,
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
const FAVORITES_COLLECTION_NAME = "Favoritos";

export default function OutfitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [allOutfits, setAllOutfits] = useState<OutfitWithItems[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(true);
  const [isCreateOutfitFormOpen, setIsCreateOutfitFormOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<OutfitWithItems | null>(null);
  const [outfitToDelete, setOutfitToDelete] = useState<OutfitWithItems | null>(null);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const initialAccordionLoadDoneRef = useRef(false);


  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<{ oldName: string; newName: string } | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const [isCreateCollectionDialogOpen, setIsCreateCollectionDialogOpen] = useState(false);
  const [newCollectionNameInput, setNewCollectionNameInput] = useState("");
  const [selectedOutfitIdsForNewCollection, setSelectedOutfitIdsForNewCollection] = useState<string[]>([]);
  const [availableOutfitsForNewCollection, setAvailableOutfitsForNewCollection] = useState<OutfitWithItems[]>([]);
  const [searchTermCreateCollection, setSearchTermCreateCollection] = useState("");


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
              isFavorite: outfitData.isFavorite || false, // Leer isFavorite
              createdAt: (outfitData.createdAt as Timestamp)?.toDate ? (outfitData.createdAt as Timestamp).toDate() : new Date(),
              description: outfitData.description || "",
            } as OutfitWithItems;
          })
        );
        setAllOutfits(outfitsData);
        
        const currentCollectionNames = [FAVORITES_COLLECTION_NAME, ...Array.from(new Set(outfitsData.map(o => o.collectionName || DEFAULT_COLLECTION_NAME)))]
          .filter((value, index, self) => self.indexOf(value) === index) // Unique names
          .sort((a, b) => {
            if (a === FAVORITES_COLLECTION_NAME) return -1;
            if (b === FAVORITES_COLLECTION_NAME) return 1;
            if (a === DEFAULT_COLLECTION_NAME) return -1;
            if (b === DEFAULT_COLLECTION_NAME) return 1;
            return a.localeCompare(b);
          });

        setOpenAccordionItems(prevOpen => {
          const newOpenSet = new Set(prevOpen.filter(name => currentCollectionNames.includes(name)));
          
          if (!initialAccordionLoadDoneRef.current && currentCollectionNames.length > 0) {
            newOpenSet.add(FAVORITES_COLLECTION_NAME); // Siempre intentar abrir Favoritos
            if (outfitsData.some(o => o.collectionName === DEFAULT_COLLECTION_NAME || !o.collectionName)) {
              newOpenSet.add(DEFAULT_COLLECTION_NAME); // Abrir General si tiene atuendos
            }
            initialAccordionLoadDoneRef.current = true;
          } else if (initialAccordionLoadDoneRef.current) {
            currentCollectionNames.forEach(name => {
              if (!prevOpen.includes(name) && (name === FAVORITES_COLLECTION_NAME || name === DEFAULT_COLLECTION_NAME || outfitsData.some(o => o.collectionName === name))) {
                newOpenSet.add(name);
              }
            });
          }
          return Array.from(newOpenSet).sort((a, b) => {
            if (a === FAVORITES_COLLECTION_NAME) return -1;
            if (b === FAVORITES_COLLECTION_NAME) return 1;
            if (a === DEFAULT_COLLECTION_NAME) return -1;
            if (b === DEFAULT_COLLECTION_NAME) return 1;
            return a.localeCompare(b);
          });
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
       initialAccordionLoadDoneRef.current = false; 
    }
  }, [user, wardrobe, toast]);

  const groupedOutfits = useMemo(() => {
    const groups: Record<string, OutfitWithItems[]> = {};
    const favoritesGroup: OutfitWithItems[] = [];

    allOutfits.forEach(outfit => {
      if (outfit.isFavorite) {
        favoritesGroup.push(outfit);
      }
      const collectionKey = outfit.collectionName || DEFAULT_COLLECTION_NAME;
      if (!groups[collectionKey]) {
        groups[collectionKey] = [];
      }
      groups[collectionKey].push(outfit);
    });
    
    const result = [];
    if (favoritesGroup.length > 0 || allOutfits.some(o => o.isFavorite)) { // Show Favorites if any outfit is favorite, even if the array is momentarily empty due to filter
      result.push({ collectionName: FAVORITES_COLLECTION_NAME, outfits: favoritesGroup });
    }

    Object.entries(groups)
      .map(([collectionName, outfits]) => ({ collectionName, outfits }))
      .sort((a, b) => {
        if (a.collectionName === DEFAULT_COLLECTION_NAME) return -1;
        if (b.collectionName === DEFAULT_COLLECTION_NAME) return 1;
        return a.collectionName.localeCompare(b.collectionName);
      })
      .forEach(group => result.push(group));
      
    return result.filter((group, index, self) => 
        index === self.findIndex((g) => g.collectionName === group.collectionName)
    );

  }, [allOutfits]);
  
  const existingCollectionNames = useMemo(() => 
    Array.from(new Set(allOutfits.map(o => o.collectionName || DEFAULT_COLLECTION_NAME)))
    .filter(name => name.trim() !== "" && name !== FAVORITES_COLLECTION_NAME) 
    .sort((a, b) => {
        if (a === DEFAULT_COLLECTION_NAME) return -1;
        if (b === DEFAULT_COLLECTION_NAME) return 1;
        return a.localeCompare(b);
    }), [allOutfits]);

  const handleCreateOutfitFormSaved = () => {
    setIsCreateOutfitFormOpen(false);
    setEditingOutfit(null);
  };

  const handleOpenCreateOutfitForm = (outfitToEdit: OutfitWithItems | null = null) => {
    setEditingOutfit(outfitToEdit);
    setIsCreateOutfitFormOpen(true);
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
    if (collectionName === DEFAULT_COLLECTION_NAME || collectionName === FAVORITES_COLLECTION_NAME) {
      toast({ title: "Información", description: `La colección "${collectionName}" no se puede editar ni eliminar.`});
      return;
    }
    setCollectionToEdit({ oldName: collectionName, newName: collectionName });
    setIsEditingCollection(true);
  };

  const handleUpdateCollectionName = async () => {
    if (!collectionToEdit || !user || isBatchUpdating) return;
    const { oldName, newName } = collectionToEdit;
    const trimmedNewCollectionName = newName.trim();

    if (!trimmedNewCollectionName) {
      toast({ title: "Nombre Inválido", description: `El nuevo nombre de la colección no puede estar vacío.`, variant: "destructive" });
      return;
    }
     if (trimmedNewCollectionName === DEFAULT_COLLECTION_NAME || trimmedNewCollectionName === FAVORITES_COLLECTION_NAME) {
      toast({ title: "Nombre Inválido", description: `No puedes renombrar una colección a "${DEFAULT_COLLECTION_NAME}" o "${FAVORITES_COLLECTION_NAME}".`, variant: "destructive" });
      return;
    }
    if (existingCollectionNames.includes(trimmedNewCollectionName) && trimmedNewCollectionName !== oldName) {
      toast({ title: "Nombre Duplicado", description: `La colección "${trimmedNewCollectionName}" ya existe.`, variant: "destructive" });
      return;
    }
    if (trimmedNewCollectionName === oldName) {
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
        setOpenAccordionItems(prev => prev.filter(name => name !== oldName));
        setIsEditingCollection(false);
        setCollectionToEdit(null);
        setIsBatchUpdating(false);
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach((outfitDoc) => {
        batch.update(doc(db, "outfits", outfitDoc.id), { collectionName: trimmedNewCollectionName });
      });
      await batch.commit();

      toast({ title: "Colección Actualizada", description: `La colección "${oldName}" ha sido renombrada a "${trimmedNewCollectionName}".` });
      
      setOpenAccordionItems(prev => {
        const updated = prev.map(name => name === oldName ? trimmedNewCollectionName : name);
        if (!updated.includes(trimmedNewCollectionName)) { 
            updated.push(trimmedNewCollectionName);
        }
        return updated.filter((value, index, self) => self.indexOf(value) === index)
          .sort((a, b) => {
            if (a === FAVORITES_COLLECTION_NAME) return -1;
            if (b === FAVORITES_COLLECTION_NAME) return 1;
            if (a === DEFAULT_COLLECTION_NAME) return -1;
            if (b === DEFAULT_COLLECTION_NAME) return 1;
            return a.localeCompare(b);
          });
      });

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
     if (collectionName === DEFAULT_COLLECTION_NAME || collectionName === FAVORITES_COLLECTION_NAME) {
      toast({ title: "Información", description: `La colección "${collectionName}" no se puede editar ni eliminar.`});
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
        if (!updated.includes(FAVORITES_COLLECTION_NAME) && allOutfits.some(o => o.isFavorite)) {
          updated.push(FAVORITES_COLLECTION_NAME);
        }
        return updated.sort((a, b) => {
            if (a === FAVORITES_COLLECTION_NAME) return -1;
            if (b === FAVORITES_COLLECTION_NAME) return 1;
            if (a === DEFAULT_COLLECTION_NAME) return -1;
            if (b === DEFAULT_COLLECTION_NAME) return 1;
            return a.localeCompare(b);
          });
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

  const handleOpenCreateCollectionDialog = useCallback(() => {
    const outfitsNotInSpecificCollection = allOutfits.filter(
      (outfit) => !outfit.collectionName || outfit.collectionName === DEFAULT_COLLECTION_NAME
    );
    setAvailableOutfitsForNewCollection(outfitsNotInSpecificCollection);
    setNewCollectionNameInput("");
    setSelectedOutfitIdsForNewCollection([]);
    setSearchTermCreateCollection("");
    setIsCreateCollectionDialogOpen(true);
  }, [allOutfits]);

  const handleToggleOutfitForNewCollection = (outfitId: string) => {
    setSelectedOutfitIdsForNewCollection((prevSelected) =>
      prevSelected.includes(outfitId)
        ? prevSelected.filter((id) => id !== outfitId)
        : [...prevSelected, outfitId]
    );
  };

  const handleCreateCollectionAndAssign = async () => {
    if (!user || isBatchUpdating) return;
    const trimmedNewCollectionName = newCollectionNameInput.trim();
    if (!trimmedNewCollectionName) {
      toast({ title: "Nombre Requerido", description: "Por favor, ingresa un nombre para la nueva colección.", variant: "destructive" });
      return;
    }
    if (trimmedNewCollectionName === DEFAULT_COLLECTION_NAME || trimmedNewCollectionName === FAVORITES_COLLECTION_NAME) {
       toast({ title: "Nombre Inválido", description: `No puedes crear una colección llamada "${DEFAULT_COLLECTION_NAME}" o "${FAVORITES_COLLECTION_NAME}".`, variant: "destructive" });
      return;
    }
     if (existingCollectionNames.includes(trimmedNewCollectionName)) {
      toast({ title: "Nombre Duplicado", description: `La colección "${trimmedNewCollectionName}" ya existe. Elige otro nombre.`, variant: "destructive" });
      return;
    }
    if (selectedOutfitIdsForNewCollection.length === 0) {
      toast({ title: "Sin Selección", description: "Por favor, selecciona al menos un atuendo para añadir a la nueva colección.", variant: "destructive" });
      return;
    }

    setIsBatchUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedOutfitIdsForNewCollection.forEach((outfitId) => {
        batch.update(doc(db, "outfits", outfitId), { collectionName: trimmedNewCollectionName });
      });
      await batch.commit();

      toast({ title: "Colección Creada y Atuendos Asignados", description: `Se creó la colección "${trimmedNewCollectionName}" y se movieron ${selectedOutfitIdsForNewCollection.length} atuendo(s).` });
      
      setOpenAccordionItems(prev => {
        const updated = new Set(prev);
        updated.add(trimmedNewCollectionName);
         if (!updated.has(FAVORITES_COLLECTION_NAME) && allOutfits.some(o => o.isFavorite)) {
            updated.add(FAVORITES_COLLECTION_NAME);
        }
        return Array.from(updated).sort((a, b) => {
            if (a === FAVORITES_COLLECTION_NAME) return -1;
            if (b === FAVORITES_COLLECTION_NAME) return 1;
            if (a === DEFAULT_COLLECTION_NAME) return -1;
            if (b === DEFAULT_COLLECTION_NAME) return 1;
            return a.localeCompare(b);
          });
      });

    } catch (error: any) {
      console.error("Error creating collection and assigning outfits:", error);
      toast({ title: "Error", description: `No se pudo crear la colección: ${error.message}`, variant: "destructive" });
    } finally {
      setIsCreateCollectionDialogOpen(false);
      setIsBatchUpdating(false);
    }
  };
  
  const filteredAvailableOutfits = useMemo(() => {
    if (!searchTermCreateCollection.trim()) {
      return availableOutfitsForNewCollection;
    }
    const lowerSearchTerm = searchTermCreateCollection.toLowerCase();
    return availableOutfitsForNewCollection.filter(outfit => 
      outfit.name.toLowerCase().includes(lowerSearchTerm)
    );
  }, [availableOutfitsForNewCollection, searchTermCreateCollection]);

  const handleToggleFavorite = async (outfitId: string, currentIsFavorite: boolean) => {
    if (!user) return;
    const outfitRef = doc(db, "outfits", outfitId);
    try {
      await updateDoc(outfitRef, { isFavorite: !currentIsFavorite });
      // Optimistic update or rely on onSnapshot for UI changes
      toast({
        title: !currentIsFavorite ? "Atuendo añadido a Favoritos" : "Atuendo quitado de Favoritos",
        description: `"${allOutfits.find(o => o.id === outfitId)?.name}" ha sido actualizado.`,
      });
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito.", variant: "destructive" });
    }
  };


  const isLoading = isLoadingWardrobe || isLoadingOutfits;

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Mis Atuendos</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleOpenCreateCollectionDialog} variant="outline" disabled={isLoading || isBatchUpdating}>
            <FolderPlus className="mr-2 h-5 w-5" />
            Crear Colección
          </Button>
          <Button onClick={() => handleOpenCreateOutfitForm()} disabled={isLoadingWardrobe || isBatchUpdating}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear Atuendo
          </Button>
        </div>
      </div>

      {/* Dialogo para Crear/Editar Atuendo */}
      <Dialog open={isCreateOutfitFormOpen} onOpenChange={(open) => {
        setIsCreateOutfitFormOpen(open);
        if (!open) setEditingOutfit(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingOutfit ? "Editar Atuendo" : "Crear Nuevo Atuendo"}</DialogTitle>
            <DialogDescription>
              {editingOutfit ? "Modifica los detalles de tu atuendo." : "Nombra tu atuendo, asígnale una colección y selecciona prendas de tu guardarropa."}
            </DialogDescription>
          </DialogHeader>
          {isCreateOutfitFormOpen && ( 
            <CreateOutfitForm
              key={editingOutfit ? `edit-${editingOutfit.id}` : 'create-new'}
              setOpen={setIsCreateOutfitFormOpen}
              wardrobeItems={wardrobe}
              onOutfitSaved={handleCreateOutfitFormSaved}
              existingOutfit={editingOutfit}
              existingCollectionNames={existingCollectionNames} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogo para Crear Colección */}
      <Dialog open={isCreateCollectionDialogOpen} onOpenChange={setIsCreateCollectionDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Crear Nueva Colección</DialogTitle>
            <DialogDescription>
              Dale un nombre a tu nueva colección y selecciona los atuendos de &quot;{DEFAULT_COLLECTION_NAME}&quot; o sin colección asignada que quieres incluir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-grow flex flex-col overflow-hidden">
            <div className="space-y-1">
              <Label htmlFor="newCollectionNameInput">Nombre de la Nueva Colección</Label>
              <Input
                id="newCollectionNameInput"
                value={newCollectionNameInput}
                onChange={(e) => setNewCollectionNameInput(e.target.value)}
                placeholder="Ej: Looks de Trabajo"
                disabled={isBatchUpdating}
              />
            </div>
            <div className="space-y-1 flex-grow flex flex-col overflow-hidden">
              <Label>Atuendos para añadir (de &quot;{DEFAULT_COLLECTION_NAME}&quot; o sin colección)</Label>
              <div className="relative mt-1 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-outfits-for-collection"
                  placeholder="Buscar atuendos..."
                  value={searchTermCreateCollection}
                  onChange={(e) => setSearchTermCreateCollection(e.target.value)}
                  className="pl-10"
                  disabled={isBatchUpdating}
                />
              </div>
              <ScrollArea className="flex-grow border rounded-md p-1">
                {filteredAvailableOutfits.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {filteredAvailableOutfits.map((outfit) => (
                      <div key={outfit.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                        <Checkbox
                          id={`outfit-select-${outfit.id}`}
                          checked={selectedOutfitIdsForNewCollection.includes(outfit.id)}
                          onCheckedChange={() => handleToggleOutfitForNewCollection(outfit.id)}
                          disabled={isBatchUpdating}
                        />
                        <Label htmlFor={`outfit-select-${outfit.id}`} className="flex-grow cursor-pointer text-sm">
                          {outfit.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    {availableOutfitsForNewCollection.length === 0 ? `No hay atuendos en "${DEFAULT_COLLECTION_NAME}" o sin colección para mover.` : `No se encontraron atuendos que coincidan con tu búsqueda.`}
                  </p>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
              <Button variant="outline" disabled={isBatchUpdating}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateCollectionAndAssign} disabled={isBatchUpdating || !newCollectionNameInput.trim() || selectedOutfitIdsForNewCollection.length === 0}>
              {isBatchUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear y Asignar
            </Button>
          </DialogFooter>
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
            <Button 
              onClick={handleUpdateCollectionName} 
              disabled={isBatchUpdating || !collectionToEdit?.newName.trim() || collectionToEdit.newName.trim() === DEFAULT_COLLECTION_NAME || collectionToEdit.newName.trim() === FAVORITES_COLLECTION_NAME || (existingCollectionNames.includes(collectionToEdit?.newName.trim() || "") && collectionToEdit?.newName.trim() !== collectionToEdit?.oldName) }
            >
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
          <Button onClick={() => handleOpenCreateOutfitForm()} size="lg" disabled={isLoadingWardrobe}>
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
                    {collectionName === FAVORITES_COLLECTION_NAME ? <Heart className="h-6 w-6 text-red-500 fill-red-500" /> : <FolderOpen className="h-6 w-6 text-primary" />}
                    {collectionName} ({outfitsInCollection.length} atuendo(s))
                    </div>
                    {collectionName !== DEFAULT_COLLECTION_NAME && collectionName !== FAVORITES_COLLECTION_NAME && (
                        <div className="flex items-center gap-2 pr-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); openEditCollectionDialog(collectionName); }}
                                className="hover:bg-accent/50 h-8 w-8"
                                disabled={isBatchUpdating}
                                aria-label={`Editar colección ${collectionName}`}
                                asChild 
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
                                asChild
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
                        onEdit={() => handleOpenCreateOutfitForm(outfit)}
                        onDelete={() => setOutfitToDelete(outfit)}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {collectionName === FAVORITES_COLLECTION_NAME 
                        ? "Aún no has añadido atuendos a tus favoritos. ¡Haz clic en el corazón de un atuendo para añadirlo!" 
                        : "No hay atuendos en esta colección."}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
