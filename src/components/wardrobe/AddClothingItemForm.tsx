
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { UploadCloud, Loader2, Sparkles } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

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

const clothingTypes = ["Camisa", "Pantalón", "Vestido", "Falda", "Chaqueta", "Jersey", "Zapatos", "Accesorio", "Otro"];
const seasons = ["Primavera", "Verano", "Otoño", "Invierno", "Todo el año"];
const fabrics = ["Algodón", "Lana", "Seda", "Lino", "Poliéster", "Cuero", "Denim", "Otro"];

const MAX_FILE_SIZE_MB = 0.7; // Reduced to 0.7MB to try and keep base64 under 1MB Firestore limit
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const FIRESTORE_APPROX_DATA_URI_LIMIT_CHARS = 1000000; // Approx 1MB limit for the data URI string

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(50, { message: "El nombre no puede exceder los 50 caracteres." }),
  type: z.string().min(1, { message: "Por favor, selecciona un tipo." }),
  color: z.string().min(1, { message: "Por favor, introduce un color." }),
  season: z.string().min(1, { message: "Por favor, selecciona una estación." }),
  fabric: z.string().min(1, { message: "Por favor, selecciona un tejido." }),
  image: z.instanceof(File).optional().refine(file => file ? file.size <= MAX_FILE_SIZE_BYTES : true, `La imagen es demasiado grande. El tamaño máximo es ${MAX_FILE_SIZE_MB}MB para asegurar que quepa en la base de datos.`),
});

interface AddClothingItemFormProps {
  onItemAdded?: () => void;
  setOpen?: (open: boolean) => void; // For closing a dialog/modal
}

const PLACEHOLDER_IMAGE_URL = "https://placehold.co/300x300.png?text=Prenda";

export function AddClothingItemForm({ onItemAdded, setOpen }: AddClothingItemFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutocompleting, setIsAutocompleting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      color: "",
      season: "",
      fabric: "",
    },
  });

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Archivo demasiado grande",
          description: `La imagen no debe exceder los ${MAX_FILE_SIZE_MB}MB. Esto es para asegurar que la información de la imagen pueda guardarse correctamente. Intenta con una imagen más pequeña.`,
          variant: "destructive",
          duration: 7000,
        });
        setSelectedImage(null);
        setPreviewUrl(null);
        form.setValue("image", undefined); 
        if (event.target) { 
            event.target.value = "";
        }
        return;
      }
      setSelectedImage(file);
      form.setValue("image", file, { shouldValidate: true }); 
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result.length > FIRESTORE_APPROX_DATA_URI_LIMIT_CHARS) {
            toast({
              title: "Imagen demasiado compleja",
              description: `Después de procesar, la información de la imagen es demasiado grande para guardarla directamente. Intenta con una imagen más simple o de menor resolución, o una con menos detalles (menos de ${MAX_FILE_SIZE_MB}MB).`,
              variant: "destructive",
              duration: 9000,
            });
            setSelectedImage(null);
            setPreviewUrl(null);
            form.setValue("image", undefined);
             if (event.target) { 
                event.target.value = "";
            }
            return;
        }
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAutocomplete = async () => {
    if (!previewUrl) {
      toast({ title: "Error", description: "Por favor, selecciona una imagen primero.", variant: "destructive" });
      return;
    }
    setIsAutocompleting(true);
    try {
      const result: AutocompleteClothingDetailsOutput = await autocompleteClothingDetails({ photoDataUri: previewUrl });
      form.setValue("type", result.type || "");
      form.setValue("color", result.color || "");
      form.setValue("season", result.season || "");
      form.setValue("fabric", result.fabric || "");
      if (!form.getValues("name") && result.type) {
         form.setValue("name", `${result.type} ${result.color}`);
      }
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
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para añadir prendas. Por favor, revisa tu sesión.", variant: "destructive", duration: 9000 });
      return;
    }
    
    let imageUrlToSave = PLACEHOLDER_IMAGE_URL;
    if (previewUrl) {
      if (previewUrl.length > FIRESTORE_APPROX_DATA_URI_LIMIT_CHARS) {
        toast({
          title: "Error al guardar: Imagen demasiado grande",
          description: `La información de la imagen es demasiado extensa para guardarse. Selecciona una imagen más pequeña (menos de ${MAX_FILE_SIZE_MB}MB) o con menos detalles.`,
          variant: "destructive",
          duration: 9000,
        });
        setIsSaving(false);
        return;
      }
      imageUrlToSave = previewUrl;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "clothingItems"), {
        userId: user.uid,
        name: values.name,
        type: values.type,
        color: values.color,
        season: values.season,
        fabric: values.fabric,
        imageUrl: imageUrlToSave,
        createdAt: serverTimestamp(),
      });

      toast({ title: "¡Prenda añadida!", description: `${values.name} se ha añadido a tu armario.` });
      form.reset();
      setSelectedImage(null);
      setPreviewUrl(null);
       const imageUploadInput = document.getElementById('image-upload') as HTMLInputElement;
       if (imageUploadInput) {
        imageUploadInput.value = "";
      }
      if (onItemAdded) onItemAdded();
      if (setOpen) setOpen(false);

    } catch (error: any) {
      console.error("Error detallado al añadir prenda:", error);
      let detailedErrorMessage = "No se pudo añadir la prenda. Revisa la consola del navegador para más detalles (F12).";
      if (error.code) { 
        detailedErrorMessage += ` Código de error: ${error.code}.`;
      } else if (error.message) {
        detailedErrorMessage += ` Mensaje: ${error.message}.`;
      }
      if (error.message?.toLowerCase().includes('document exceeds maximum size')) {
          detailedErrorMessage = `Error: La prenda con la imagen es demasiado grande para guardarse. Intenta con una imagen más pequeña (menos de ${MAX_FILE_SIZE_MB}MB).`;
      } else if (error.code === 'permission-denied' && error.message?.toLowerCase().includes('firestore')) {
         detailedErrorMessage = "Error de permisos al guardar en la base de datos. Asegúrate de que las reglas de Firestore son correctas y estás autenticado. Revisa la consola (F12).";
      }

      toast({ 
        title: "Error al Guardar Prenda", 
        description: detailedErrorMessage, 
        variant: "destructive",
        duration: 15000
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Imagen de la Prenda (Max. ${MAX_FILE_SIZE_MB}MB)</FormLabel>
              <FormControl>
                <div className="flex flex-col items-center space-y-4">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:border-primary transition-colors"
                  >
                    {previewUrl ? (
                      <Image src={previewUrl} alt="Previsualización" width={150} height={150} className="object-contain max-h-full" data-ai-hint="clothing item" />
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
                  {previewUrl && (
                    <Button
                      type="button"
                      onClick={handleAIAutocomplete}
                      disabled={isAutocompleting || isSaving || !selectedImage}
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
                    {clothingTypes.map(type => (
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

        <Button type="submit" className="w-full" disabled={isSaving || isAutocompleting || !form.formState.isValid}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSaving ? "Guardando prenda..." : "Añadir Prenda"}
        </Button>
        {!form.formState.isValid && form.formState.isSubmitted && <p className="text-sm text-destructive text-center mt-2">Revisa los campos. Hay errores o faltan datos.</p>}
      </form>
    </Form>
  );
}
