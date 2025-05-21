
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, type ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { UploadCloud, Loader2, Sparkles } from "lucide-react";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore"; 

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
import { autocompleteClothingDetails } from "@/ai/flows/autocomplete-clothing-details";
import type { AutocompleteClothingDetailsOutput } from "@/ai/flows/autocomplete-clothing-details";
import type { ClothingItem } from "@/types";

const clothingCategoriesAsTypes = ["Prendas superiores", "Prendas inferiores", "Entero", "Abrigos", "Zapatos", "Accesorios", "Otros"];
const seasons = ["Primavera", "Verano", "Otoño", "Invierno", "Todo el año"];
const fabrics = ["Algodón", "Lana", "Seda", "Lino", "Poliéster", "Cuero", "Denim", "Otro"];

const MAX_FILE_SIZE_MB = 0.7; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const FIRESTORE_APPROX_DATA_URI_LIMIT_CHARS = 1000000; 

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(50, { message: "El nombre no puede exceder los 50 caracteres." }),
  type: z.string().min(1, { message: "Por favor, selecciona un tipo." }),
  color: z.string().min(1, { message: "Por favor, introduce un color." }),
  season: z.string().min(1, { message: "Por favor, selecciona una estación." }),
  fabric: z.string().min(1, { message: "Por favor, selecciona un tejido." }),
  image: z.instanceof(File).optional().refine(file => file ? file.size <= MAX_FILE_SIZE_BYTES : true, `La imagen es demasiado grande. El tamaño máximo es ${MAX_FILE_SIZE_MB}MB para asegurar que quepa en la base de datos.`),
});

interface AddClothingItemFormProps {
  itemToEdit?: ClothingItem;
  onItemSaved?: () => void;
  setOpen: (open: boolean) => void; 
}

const PLACEHOLDER_IMAGE_URL = "https://placehold.co/300x300.png?text=Prenda";

export function AddClothingItemForm({ itemToEdit, onItemSaved, setOpen }: AddClothingItemFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutocompleting, setIsAutocompleting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: itemToEdit?.name || "",
      type: itemToEdit?.type || "",
      color: itemToEdit?.color || "",
      season: itemToEdit?.season || "",
      fabric: itemToEdit?.fabric || "",
      image: undefined,
    },
  });

  const mode = itemToEdit ? 'edit' : 'add';

  useEffect(() => {
    if (mode === 'edit' && itemToEdit) {
      form.reset({
        name: itemToEdit.name,
        type: itemToEdit.type,
        color: itemToEdit.color,
        season: itemToEdit.season,
        fabric: itemToEdit.fabric,
        image: undefined, 
      });
      if (itemToEdit.imageUrl && itemToEdit.imageUrl !== PLACEHOLDER_IMAGE_URL && itemToEdit.imageUrl.startsWith('data:image')) {
        setPreviewUrl(itemToEdit.imageUrl);
      } else {
        setPreviewUrl(null);
      }
      setSelectedImage(null); 
    } else { // mode === 'add'
      form.reset({
        name: "", type: "", color: "", season: "", fabric: "", image: undefined,
      });
      setPreviewUrl(null);
      setSelectedImage(null);
    }
  }, [itemToEdit, mode, form]); 

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Archivo demasiado grande",
          description: `La imagen no debe exceder los ${MAX_FILE_SIZE_MB}MB. Esto es para asegurar que la información de la imagen pueda guardarse directamente en la base de datos. Intenta con una imagen más pequeña.`,
          variant: "destructive",
          duration: 9000,
        });
        setSelectedImage(null);
        setPreviewUrl(mode === 'edit' && itemToEdit?.imageUrl && itemToEdit.imageUrl !== PLACEHOLDER_IMAGE_URL ? itemToEdit.imageUrl : null); 
        form.setValue("image", undefined); 
        if (event.target) event.target.value = "";
        return;
      }
      setSelectedImage(file);
      form.setValue("image", file, { shouldValidate: true }); 
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result.length > FIRESTORE_APPROX_DATA_URI_LIMIT_CHARS) {
            toast({
              title: "Imagen demasiado compleja para Data URI",
              description: `Después de procesar, la información de la imagen (Data URI) es demasiado grande para guardarla directamente en Firestore (límite ~1MB por documento). Intenta con una imagen más simple o de menor resolución (original < ${MAX_FILE_SIZE_MB}MB).`,
              variant: "destructive",
              duration: 10000,
            });
            setSelectedImage(null);
            setPreviewUrl(mode === 'edit' && itemToEdit?.imageUrl && itemToEdit.imageUrl !== PLACEHOLDER_IMAGE_URL ? itemToEdit.imageUrl : null); // Revert
            form.setValue("image", undefined);
            if (event.target) event.target.value = "";
            return;
        }
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAutocomplete = async () => {
    if (!previewUrl) {
      toast({ title: "Error", description: "Por favor, selecciona o carga una imagen primero.", variant: "destructive" });
      return;
    }
    setIsAutocompleting(true);
    try {
      const result: AutocompleteClothingDetailsOutput = await autocompleteClothingDetails({ photoDataUri: previewUrl });
      
      const currentName = form.getValues("name");
      if ((!currentName || mode === 'add') && result.name) {
        form.setValue("name", result.name);
      } else if (!currentName && result.type && result.color) {
        form.setValue("name", `${result.type} ${result.color}`);
      } else if (!currentName && result.type) {
        form.setValue("name", result.type);
      }
      
      let suggestedSeason = result.season || "";
      if (!seasons.includes(suggestedSeason)) {
        suggestedSeason = "Todo el año"; 
      }

      const suggestedType = result.type || "";
      if(clothingCategoriesAsTypes.includes(suggestedType)){
        form.setValue("type", suggestedType);
      } else if(form.getValues("type") === ""){
         form.setValue("type", "Otros"); // Fallback si la IA no da un tipo válido y está vacío
      }
      
      form.setValue("color", result.color || form.getValues("color"));
      form.setValue("season", suggestedSeason);
      form.setValue("fabric", result.fabric || form.getValues("fabric"));

      toast({ title: "¡Autocompletado!", description: "Campos sugeridos por IA." });
    } catch (error) {
      console.error("Error autocompleting with AI:", error);
      toast({ title: "Error de IA", description: "No se pudieron autocompletar los detalles.", variant: "destructive" });
    } finally {
      setIsAutocompleting(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión. Por favor, revisa tu sesión.", variant: "destructive", duration: 9000 });
      return;
    }
    
    setIsSaving(true);
    let imageUrlToSave: string;

    if (selectedImage && previewUrl && previewUrl.startsWith('data:image')) { 
      if (previewUrl.length > FIRESTORE_APPROX_DATA_URI_LIMIT_CHARS) {
        toast({
          title: "Error al guardar: Imagen (Data URI) demasiado grande",
          description: `La información de la nueva imagen es demasiado extensa para guardarla en Firestore (límite ~1MB por documento). Selecciona una imagen más pequeña (original < ${MAX_FILE_SIZE_MB}MB).`,
          variant: "destructive",
          duration: 10000,
        });
        setIsSaving(false);
        return;
      }
      imageUrlToSave = previewUrl;
    } else if (mode === 'edit' && itemToEdit?.imageUrl && itemToEdit.imageUrl !== PLACEHOLDER_IMAGE_URL && itemToEdit.imageUrl.startsWith('data:image')) { 
      imageUrlToSave = itemToEdit.imageUrl; 
    } else if (mode === 'edit' && itemToEdit?.imageUrl === PLACEHOLDER_IMAGE_URL && !selectedImage) {
      imageUrlToSave = PLACEHOLDER_IMAGE_URL; 
    }
    else { 
      imageUrlToSave = PLACEHOLDER_IMAGE_URL;
    }

    const dataToSave = {
      userId: user.uid,
      name: values.name,
      type: values.type,
      color: values.color,
      season: values.season,
      fabric: values.fabric,
      imageUrl: imageUrlToSave,
    };

    try {
      if (mode === 'edit' && itemToEdit) {
        const itemRef = doc(db, "clothingItems", itemToEdit.id);
        await updateDoc(itemRef, { ...dataToSave, updatedAt: serverTimestamp() }); 
        toast({ title: "¡Prenda actualizada!", description: `"${values.name}" se ha actualizado en tu armario.` });
      } else {
        await addDoc(collection(db, "clothingItems"), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: "¡Prenda añadida!", description: `"${values.name}" se ha añadido a tu armario.` });
      }

      form.reset({ name: "", type: "", color: "", season: "", fabric: "", image: undefined });
      setSelectedImage(null);
      setPreviewUrl(null);
      const imageUploadInput = document.getElementById('image-upload') as HTMLInputElement;
      if (imageUploadInput) imageUploadInput.value = "";
      
      if (onItemSaved) onItemSaved();
      setOpen(false);

    } catch (error: any) {
      console.error("Error detallado al guardar prenda:", error);
      let detailedErrorMessage = "No se pudo guardar la prenda. Revisa la consola del navegador para más detalles (F12).";
      if (error.code) detailedErrorMessage += ` Código: ${error.code}.`;
      else if (error.message) detailedErrorMessage += ` Mensaje: ${error.message}.`;
      
      if (error.message?.toLowerCase().includes('document exceeds maximum size') || error.message?.toLowerCase().includes('payload is too large') || error.code === 'invalid-argument') {
          detailedErrorMessage = `Error: La prenda con la imagen (Data URI) es demasiado grande para guardarse en Firestore (límite ~${MAX_FILE_SIZE_MB}MB por imagen). Intenta con una imagen más pequeña.`;
      } else if (error.code === 'permission-denied' && error.message?.toLowerCase().includes('firestore')) {
         detailedErrorMessage = "Error de permisos al guardar en la base de datos. Asegúrate de que las reglas de Firestore son correctas y estás autenticado. Revisa la consola (F12).";
      }
      toast({ title: "Error al Guardar Prenda", description: detailedErrorMessage, variant: "destructive", duration: 15000 });
    } finally {
      setIsSaving(false);
    }
  }
  
  const currentPreviewImage = previewUrl || (mode === 'edit' && itemToEdit?.imageUrl && itemToEdit.imageUrl !== PLACEHOLDER_IMAGE_URL && itemToEdit.imageUrl.startsWith('data:image') ? itemToEdit.imageUrl : null);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Imagen de la Prenda (Max. ${MAX_FILE_SIZE_MB}MB para Base64 en Firestore)</FormLabel>
              <FormControl>
                <div className="flex flex-col items-center space-y-4">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:border-primary transition-colors"
                  >
                    {currentPreviewImage ? (
                      <Image src={currentPreviewImage} alt="Previsualización" width={150} height={150} className="object-contain max-h-full" data-ai-hint="clothing item" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                        <UploadCloud className="w-10 h-10 mb-3" />
                        <p className="mb-2 text-sm">
                          <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs">PNG, JPG, WEBP (MAX. ${MAX_FILE_SIZE_MB}MB)</p>
                      </div>
                    )}
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={isSaving || isAutocompleting}
                    />
                  </label>
                  {currentPreviewImage && ( 
                    <Button
                      type="button"
                      onClick={handleAIAutocomplete}
                      disabled={isAutocompleting || isSaving}
                      variant="outline"
                      size="sm"
                    >
                      {isAutocompleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Autocompletar con IA
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormMessage /> 
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la prenda</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Camisa de lino azul" {...field} disabled={isSaving || isAutocompleting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSaving || isAutocompleting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clothingCategoriesAsTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Azul marino" {...field} disabled={isSaving || isAutocompleting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="season"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSaving || isAutocompleting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una estación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {seasons.map(season => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fabric"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tejido</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value} disabled={isSaving || isAutocompleting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tejido" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fabrics.map(fabric => (
                      <SelectItem key={fabric} value={fabric}>{fabric}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSaving || isAutocompleting || !form.formState.isValid && form.formState.isSubmitted}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSaving ? (mode === 'edit' ? "Guardando cambios..." : "Guardando prenda...") : (mode === 'edit' ? "Guardar Cambios" : "Añadir Prenda")}
        </Button>
        {!form.formState.isValid && form.formState.isSubmitted && <p className="text-sm text-destructive text-center mt-2">Revisa los campos. Hay errores o faltan datos.</p>}
      </form>
    </Form>
  );
}
