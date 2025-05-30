
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Eye, Loader2, Search } from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext"; 
import { useToast } from "@/hooks/use-toast";
import type { ClothingItem, OutfitWithItems } from "@/types";

const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(50, {message: "El nombre no puede exceder 50 caracteres."}),
});

interface CreateOutfitFormProps {
  setOpen: (open: boolean) => void;
  wardrobeItems: ClothingItem[];
  onOutfitSaved: () => void;
  existingOutfit?: OutfitWithItems | null;
}

// Las categorías son ahora los mismos tipos que se guardan para las prendas
const outfitCategories = [
  "Prendas superiores", 
  "Prendas inferiores", 
  "Entero", 
  "Abrigos", 
  "Zapatos", 
  "Accesorios", 
  "Otros",
];


export function CreateOutfitForm({ setOpen, wardrobeItems, onOutfitSaved, existingOutfit }: CreateOutfitFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (existingOutfit) {
      form.reset({ name: existingOutfit.name || "" });
      setSelectedItemIds(existingOutfit.itemIds || []);
    } else {
      form.reset({ name: "" });
      setSelectedItemIds([]);
    }
  }, [existingOutfit, form]);
  
  const filteredAndGroupedItems = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = wardrobeItems.filter(item => 
      item.name.toLowerCase().includes(lowerSearchTerm) ||
      item.type.toLowerCase().includes(lowerSearchTerm) || // El type de la prenda ya es la categoría
      item.color.toLowerCase().includes(lowerSearchTerm)
    );

    // Agrupar los ítems filtrados por su tipo (que ahora es la categoría)
    const grouped = outfitCategories.map(categoryName => {
      const itemsInCategory = filtered.filter(item => item.type === categoryName);
      return {
        name: categoryName, // El nombre de la categoría del acordeón
        items: itemsInCategory
      };
    });
    
    // Filtrar categorías vacías (a menos que la búsqueda esté activa)
    return grouped.filter(category => category.items.length > 0 || searchTerm);

  }, [wardrobeItems, searchTerm]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para guardar atuendos.", variant: "destructive" });
      return;
    }
    if (selectedItemIds.length === 0) {
      toast({ title: "Selección requerida", description: "Debes seleccionar al menos una prenda para el atuendo.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const outfitData = {
      userId: user.uid,
      name: values.name,
      itemIds: selectedItemIds,
      description: "", 
    };

    try {
      if (existingOutfit) {
        const outfitRef = doc(db, "outfits", existingOutfit.id);
        await updateDoc(outfitRef, { ...outfitData, updatedAt: serverTimestamp() });
        toast({ title: "¡Atuendo Actualizado!", description: `"${values.name}" ha sido actualizado.` });
      } else {
        await addDoc(collection(db, "outfits"), { ...outfitData, createdAt: serverTimestamp() });
        toast({ title: "¡Atuendo Creado!", description: `"${values.name}" ha sido creado.` });
      }
      onOutfitSaved();
      setOpen(false);
    } catch (error: any) {
      console.error("Error saving outfit:", error);
      const errorMessage = error.code ? `Código: ${error.code}. Mensaje: ${error.message}` : error.message || "Ocurrió un error desconocido.";
      toast({ 
        title: "Error al Guardar Atuendo", 
        description: `No se pudo guardar: ${errorMessage}. Revisa la consola del navegador (F12) para más detalles y verifica tus reglas de Firestore.`, 
        variant: "destructive",
        duration: 15000 
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
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

        <div>
          <FormLabel htmlFor="search-prendas">Buscar Prendas</FormLabel>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-prendas"
              placeholder="Buscar por nombre, categoría, color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <FormLabel>Seleccionar Prendas</FormLabel>
        <ScrollArea className="flex-grow border rounded-md p-1">
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
                                 checked={selectedItemIds.includes(item.id)}
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
        
        <div className="mt-auto pt-4 space-y-3 border-t">
           <p className="text-sm text-muted-foreground">Prendas seleccionadas: {selectedItemIds.length}</p>
           <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || selectedItemIds.length === 0}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              {existingOutfit ? "Guardar Cambios" : "Previsualizar y Guardar"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
