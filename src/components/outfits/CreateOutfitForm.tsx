
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Eye, Loader2, Search, PlusCircle, ChevronRight } from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ClothingItem, OutfitWithItems } from "@/types";
import { SelectItemsDialog } from "./SelectItemsDialog"; 
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const DEFAULT_COLLECTION_NAME = "General";
const CREATE_NEW_COLLECTION_VALUE = "__CREATE_NEW__";
const clothingCategoriesForForm = ["Prendas superiores", "Prendas inferiores", "Entero", "Abrigos", "Zapatos", "Accesorios", "Otros"];

const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(50, {message: "El nombre no puede exceder 50 caracteres."}),
  itemIds: z.array(z.string()).min(1, { message: "Debes seleccionar al menos una prenda." }),
  collectionSelection: z.string().optional(),
  newCollectionNameInput: z.string().optional(),
});

interface CreateOutfitFormProps {
  setOpen: (open: boolean) => void;
  wardrobeItems: ClothingItem[];
  onOutfitSaved: () => void;
  existingOutfit?: OutfitWithItems | null;
  existingCollectionNames: string[];
}

export function CreateOutfitForm({ setOpen, wardrobeItems, onOutfitSaved, existingOutfit, existingCollectionNames }: CreateOutfitFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);

  const [isSelectItemsDialogOpen, setIsSelectItemsDialogOpen] = useState(false);
  const [categoryForSelection, setCategoryForSelection] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      itemIds: [],
      collectionSelection: DEFAULT_COLLECTION_NAME,
      newCollectionNameInput: "",
    },
  });

  const currentItemIds = form.watch("itemIds");
  const collectionSelectionValue = form.watch("collectionSelection");

  useEffect(() => {
    if (existingOutfit) {
      form.reset({
        name: existingOutfit.name || "",
        itemIds: existingOutfit.itemIds || [],
        collectionSelection: DEFAULT_COLLECTION_NAME,
        newCollectionNameInput: "",
      });

      const currentOutfitCollection = existingOutfit.collectionName || DEFAULT_COLLECTION_NAME;
      if (existingCollectionNames.includes(currentOutfitCollection) || currentOutfitCollection === DEFAULT_COLLECTION_NAME) {
        form.setValue("collectionSelection", currentOutfitCollection);
        setShowNewCollectionInput(false);
      } else {
        form.setValue("collectionSelection", CREATE_NEW_COLLECTION_VALUE);
        form.setValue("newCollectionNameInput", currentOutfitCollection);
        setShowNewCollectionInput(true);
      }
    } else {
      form.reset({
        name: "",
        itemIds: [],
        collectionSelection: DEFAULT_COLLECTION_NAME,
        newCollectionNameInput: "",
      });
      setShowNewCollectionInput(false);
    }
  }, [existingOutfit, form, existingCollectionNames]);

  useEffect(() => {
    if (collectionSelectionValue === CREATE_NEW_COLLECTION_VALUE) {
      setShowNewCollectionInput(true);
    } else {
      setShowNewCollectionInput(false);
      form.setValue("newCollectionNameInput", "");
    }
  }, [collectionSelectionValue, form]);

  const handleItemSelectToggle = (itemId: string) => {
    const currentSelectedIds = form.getValues("itemIds") || [];
    const newSelectedIds = currentSelectedIds.includes(itemId)
      ? currentSelectedIds.filter(id => id !== itemId)
      : [...currentSelectedIds, itemId];
    form.setValue("itemIds", newSelectedIds, { shouldValidate: true, shouldDirty: true });
  };

  const openSelectItemsDialog = (category: string) => {
    setCategoryForSelection(category);
    setIsSelectItemsDialogOpen(true);
  };

  const selectedItemsDetails = useMemo(() => {
    return currentItemIds.map(id => wardrobeItems.find(item => item.id === id)).filter(Boolean) as ClothingItem[];
  }, [currentItemIds, wardrobeItems]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para guardar atuendos.", variant: "destructive" });
      return;
    }

    let finalCollectionName = DEFAULT_COLLECTION_NAME;
    if (values.collectionSelection === CREATE_NEW_COLLECTION_VALUE) {
      const trimmedNewCollection = values.newCollectionNameInput?.trim();
      if (!trimmedNewCollection) {
        form.setError("newCollectionNameInput", { type: "manual", message: "El nombre de la nueva colección no puede estar vacío." });
        return;
      }
       if (trimmedNewCollection === DEFAULT_COLLECTION_NAME) {
         form.setError("newCollectionNameInput", { type: "manual", message: `No puedes llamar a una nueva colección "${DEFAULT_COLLECTION_NAME}".` });
        return;
      }
      if (existingCollectionNames.includes(trimmedNewCollection) && (!existingOutfit || existingOutfit.collectionName !== trimmedNewCollection) ) {
         form.setError("newCollectionNameInput", { type: "manual", message: `La colección "${trimmedNewCollection}" ya existe.` });
        return;
      }
      finalCollectionName = trimmedNewCollection;
    } else if (values.collectionSelection) {
      finalCollectionName = values.collectionSelection;
    }

    if (finalCollectionName === CREATE_NEW_COLLECTION_VALUE) {
        finalCollectionName = DEFAULT_COLLECTION_NAME;
    }

    setIsSaving(true);
    const outfitData = {
        userId: user.uid,
        name: values.name,
        itemIds: values.itemIds,
        collectionName: finalCollectionName,
        isFavorite: existingOutfit?.isFavorite || false,
        description: existingOutfit?.description || "",
        updatedAt: serverTimestamp(),
    };

    try {
      if (existingOutfit) {
        const outfitRef = doc(db, "outfits", existingOutfit.id);
        await updateDoc(outfitRef, outfitData);
        toast({ title: "¡Atuendo Actualizado!", description: `"${values.name}" ha sido actualizado.` });
      } else {
        await addDoc(collection(db, "outfits"), {
            ...outfitData,
            createdAt: serverTimestamp(),
        });
        toast({ title: "¡Atuendo Creado!", description: `"${values.name}" ha sido creado en la colección "${finalCollectionName}".` });
      }
      onOutfitSaved();
      setOpen(false);
    } catch (error: any) {
      console.error("Error saving outfit:", error);
      const errorMessage = error.code ? `Código: ${error.code}. Mensaje: ${error.message}` : error.message || "Ocurrió un error desconocido.";
      toast({
        title: "Error al Guardar Atuendo",
        description: `No se pudo guardar: ${errorMessage}. Revisa la consola (F12).`,
        variant: "destructive",
        duration: 9000
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col flex-grow overflow-hidden">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Atuendo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Look casual de viernes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <FormField
            control={form.control}
            name="collectionSelection"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="collection-select">Colección</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || DEFAULT_COLLECTION_NAME}
                  defaultValue={DEFAULT_COLLECTION_NAME}
                >
                  <FormControl>
                    <SelectTrigger id="collection-select">
                      <SelectValue placeholder="Selecciona una colección" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={DEFAULT_COLLECTION_NAME}>{DEFAULT_COLLECTION_NAME}</SelectItem>
                    {existingCollectionNames.filter(name => name !== DEFAULT_COLLECTION_NAME).map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                    <SelectItem value={CREATE_NEW_COLLECTION_VALUE}>
                      <div className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                        Crear nueva colección...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showNewCollectionInput && (
            <FormField
              control={form.control}
              name="newCollectionNameInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="new-collection-input">Nombre de Nueva Colección</FormLabel>
                  <FormControl>
                    <Input
                      id="new-collection-input"
                      placeholder="Ej: Looks de Trabajo"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="itemIds"
          render={() => (
            <FormItem className="flex-grow flex flex-col overflow-hidden">
              <FormLabel>Prendas Seleccionadas ({currentItemIds.length})</FormLabel>
              <FormMessage className="pb-1"/>
              <div className="space-y-2 border rounded-md p-2 bg-muted/20">
                {clothingCategoriesForForm.map(category => (
                  <Button
                    type="button"
                    key={category}
                    variant="outline"
                    className="w-full justify-between hover:bg-accent/20"
                    onClick={() => openSelectItemsDialog(category)}
                  >
                    <span>{category}</span>
                    <div className="flex items-center">
                       <span className="text-xs text-muted-foreground mr-2">
                        ({currentItemIds.filter(id => wardrobeItems.find(item => item.id === id)?.type === category).length} sel.)
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Button>
                ))}
              </div>
              {selectedItemsDetails.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Prendas en este atuendo:</p>
                  <ScrollArea className="h-28 border rounded-md">
                    <div className="flex space-x-2 p-2">
                      {selectedItemsDetails.map(item => (
                        <div key={item.id} className="shrink-0 w-20 flex flex-col items-center">
                          <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden border">
                            <Image
                              src={item.imageUrl || "https://placehold.co/150x200.png?text=Prenda"}
                              alt={item.name}
                              layout="fill"
                              objectFit="cover"
                              data-ai-hint="clothing item"
                            />
                          </div>
                          <p className="text-xs truncate text-center mt-1 w-full" title={item.name}>{item.name}</p>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </FormItem>
          )}
        />

        {categoryForSelection && (
          <SelectItemsDialog
            open={isSelectItemsDialogOpen}
            onOpenChange={setIsSelectItemsDialogOpen}
            categoryName={categoryForSelection}
            allItems={wardrobeItems}
            selectedItemIds={currentItemIds}
            onItemToggle={handleItemSelectToggle}
          />
        )}

        <div className="mt-auto pt-4 space-y-3 border-t">
           <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || (form.formState.isSubmitted && !form.formState.isValid && !form.formState.isDirty) }>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              {existingOutfit ? "Guardar Cambios" : "Guardar Atuendo"}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

