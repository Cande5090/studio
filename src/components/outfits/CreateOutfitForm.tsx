
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form"; // Import FormProvider
import * as z from "zod";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Eye, Loader2, Search, PlusCircle } from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  // Form, // No longer import Form from here
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Keep these
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

const DEFAULT_COLLECTION_NAME = "General";
const CREATE_NEW_COLLECTION_VALUE = "__CREATE_NEW__";
const clothingCategoriesForForm = ["Prendas superiores", "Prendas inferiores", "Entero", "Abrigos", "Zapatos", "Accesorios", "Otros"];

const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(50, {message: "El nombre no puede exceder 50 caracteres."}),
  itemIds: z.array(z.string()).min(1, { message: "Debes seleccionar al menos una prenda." }),
  collectionSelection: z.string().optional(), // Para el Select
  newCollectionNameInput: z.string().optional(), // Para el Input condicional
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);

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
        collectionSelection: DEFAULT_COLLECTION_NAME, // Se ajustará abajo
        newCollectionNameInput: "",
      });

      const currentOutfitCollection = existingOutfit.collectionName || DEFAULT_COLLECTION_NAME;
      if (existingCollectionNames.includes(currentOutfitCollection) || currentOutfitCollection === DEFAULT_COLLECTION_NAME) {
        form.setValue("collectionSelection", currentOutfitCollection);
        setShowNewCollectionInput(false);
      } else { // Colección del atuendo no está en la lista (fue nueva o "General" no estaba en la lista por error)
        form.setValue("collectionSelection", CREATE_NEW_COLLECTION_VALUE);
        form.setValue("newCollectionNameInput", currentOutfitCollection);
        setShowNewCollectionInput(true);
      }
    } else { // Modo Añadir
      form.reset({
        name: "",
        itemIds: [],
        collectionSelection: DEFAULT_COLLECTION_NAME,
        newCollectionNameInput: "",
      });
      setShowNewCollectionInput(false);
      setOpenAccordions([]); // Cerrar acordeones por defecto al añadir uno nuevo
    }
  }, [existingOutfit, form, existingCollectionNames]);

  useEffect(() => {
    if (collectionSelectionValue === CREATE_NEW_COLLECTION_VALUE) {
      setShowNewCollectionInput(true);
    } else {
      setShowNewCollectionInput(false);
      form.setValue("newCollectionNameInput", ""); // Limpiar si se selecciona una existente o "General"
    }
  }, [collectionSelectionValue, form]);


  const filteredAndGroupedItems = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = wardrobeItems.filter(item =>
      item.name.toLowerCase().includes(lowerSearchTerm) ||
      (item.type && item.type.toLowerCase().includes(lowerSearchTerm)) ||
      (item.color && item.color.toLowerCase().includes(lowerSearchTerm))
    );

    const grouped: { [key: string]: ClothingItem[] } = {};
    clothingCategoriesForForm.forEach(categoryName => grouped[categoryName] = []);

    filtered.forEach(item => {
      const categoryKey = item.type && clothingCategoriesForForm.includes(item.type) ? item.type : "Otros";
      grouped[categoryKey].push(item);
    });

    return clothingCategoriesForForm.map(categoryName => ({
      name: categoryName,
      items: grouped[categoryName] || []
    })).filter(category => category.items.length > 0 || searchTerm.trim() === '');
  }, [wardrobeItems, searchTerm]);

  const handleItemSelect = (itemId: string) => {
    const currentSelectedIds = form.getValues("itemIds") || [];
    const newSelectedIds = currentSelectedIds.includes(itemId)
      ? currentSelectedIds.filter(id => id !== itemId)
      : [...currentSelectedIds, itemId];
    form.setValue("itemIds", newSelectedIds, { shouldValidate: true, shouldDirty: true });
  };


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
        // toast({ title: "Nombre de Colección Requerido", description: "Si creas una nueva colección, debes darle un nombre.", variant: "destructive" });
        return;
      }
       if (trimmedNewCollection === DEFAULT_COLLECTION_NAME) {
         form.setError("newCollectionNameInput", { type: "manual", message: `No puedes llamar a una nueva colección "${DEFAULT_COLLECTION_NAME}".` });
        // toast({ title: "Nombre de Colección Inválido", description: `No puedes crear una colección llamada "${DEFAULT_COLLECTION_NAME}".`, variant: "destructive" });
        return;
      }
      if (existingCollectionNames.includes(trimmedNewCollection) && (!existingOutfit || existingOutfit.collectionName !== trimmedNewCollection) ) {
         form.setError("newCollectionNameInput", { type: "manual", message: `La colección "${trimmedNewCollection}" ya existe.` });
        // toast({ title: "Colección Duplicada", description: `La colección "${trimmedNewCollection}" ya existe. Elige otro nombre o selecciónala de la lista.`, variant: "destructive" });
        return;
      }
      finalCollectionName = trimmedNewCollection;
    } else if (values.collectionSelection) {
      finalCollectionName = values.collectionSelection;
    }

    if (finalCollectionName === CREATE_NEW_COLLECTION_VALUE) { // Fallback por si acaso
        finalCollectionName = DEFAULT_COLLECTION_NAME;
    }

    setIsSaving(true);
    const outfitData = {
        userId: user.uid,
        name: values.name,
        itemIds: values.itemIds,
        collectionName: finalCollectionName,
        isFavorite: existingOutfit?.isFavorite || false, // Conservar estado de favorito al editar
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
    <FormProvider {...form}> {/* Changed from <Form> to <FormProvider> */}
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

        <div>
          <FormLabel htmlFor="search-prendas-outfit-form">Buscar Prendas</FormLabel>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-prendas-outfit-form"
              placeholder="Buscar por nombre, categoría, color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <FormField
            control={form.control}
            name="itemIds"
            render={() => ( // field no se usa directamente aquí si manejamos el valor con form.setValue
                <FormItem className="flex-grow flex flex-col overflow-hidden"> {/* This is the parent of ScrollArea */}
                    <FormLabel>Seleccionar Prendas ({currentItemIds.length})</FormLabel>
                     <FormMessage className="pb-1"/> {/* Para mostrar el error "Debes seleccionar al menos una prenda." */}
                    <ScrollArea className="h-full border rounded-md p-1 min-h-0"> {/* This is the ScrollArea with h-full and min-h-0, flex-grow removed */}
                    <Accordion
                        type="multiple"
                        className="w-full"
                        value={openAccordions}
                        onValueChange={setOpenAccordions}
                    >
                        {filteredAndGroupedItems.map(category => (
                        <AccordionItem value={category.name} key={category.name}>
                            <AccordionTrigger className="px-3 py-2 hover:bg-muted/50 rounded-md">
                            {category.name} ({category.items.length} prenda(s))
                            </AccordionTrigger>
                            <AccordionContent className="px-1 pt-1 pb-2">
                            {category.items.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
                                {category.items.map(item => {
                                    const checkboxId = `checkbox-outfit-item-${item.id}`;
                                    return (
                                    <div key={item.id} className="relative p-2 border rounded-md hover:shadow-md flex flex-col items-center gap-2 bg-background hover:bg-card transition-all">
                                        <label htmlFor={checkboxId} className="absolute top-2 right-2 z-10 cursor-pointer">
                                        <Checkbox
                                            id={checkboxId}
                                            checked={currentItemIds.includes(item.id)}
                                            onCheckedChange={() => handleItemSelect(item.id)}
                                            className="h-5 w-5"
                                            aria-labelledby={`item-label-${item.id}`}
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
                                        <label htmlFor={checkboxId} id={`item-label-${item.id}`} className="text-xs text-center truncate w-full font-medium cursor-pointer">
                                        {item.name}
                                        </label>
                                    </div>
                                    );
                                })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 text-center">No hay prendas en esta categoría {searchTerm && "que coincidan con tu búsqueda"}.</p>
                            )}
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                        {wardrobeItems.length > 0 && filteredAndGroupedItems.length === 0 && searchTerm && (
                            <p className="text-sm text-muted-foreground p-4 text-center">No se encontraron prendas que coincidan con &quot;{searchTerm}&quot;.</p>
                        )}
                        {wardrobeItems.length === 0 && (
                            <p className="text-sm text-muted-foreground p-4 text-center">Tu guardarropa está vacío. Añade prendas para poder crear atuendos.</p>
                        )}
                    </Accordion>
                    </ScrollArea>
                </FormItem>
            )}
        />

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
