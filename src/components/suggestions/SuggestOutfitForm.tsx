
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

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
import type { ClothingItem } from "@/types";

const formSchema = z.object({
  occasion: z.string().min(3, { message: "La ocasión debe tener al menos 3 caracteres." }).max(50, { message: "La ocasión no puede exceder los 50 caracteres." }),
});

interface SuggestOutfitFormProps {
  wardrobe: ClothingItem[];
  onSuggest: (occasion: string) => Promise<void>; // Cambiado
  isSuggesting: boolean; // Controlado por el padre
}

export function SuggestOutfitForm({ wardrobe, onSuggest, isSuggesting }: SuggestOutfitFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occasion: "",
    },
  });

  // El estado isSuggesting ahora es manejado por la página padre.
  // El onSuggestionReceived también es manejado por la página padre a través de onSuggest.

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onSuggest(values.occasion);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg shadow-md">
        <FormField
          control={form.control}
          name="occasion"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">¿Para qué ocasión necesitas un atuendo?</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Cena formal, día casual, boda..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSuggesting || wardrobe.length === 0}>
          {isSuggesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isSuggesting ? "Buscando sugerencia..." : "Sugerir Atuendo"}
        </Button>
        {wardrobe.length === 0 && <p className="text-sm text-destructive text-center mt-2">Añade prendas a tu armario para obtener sugerencias.</p>}
      </form>
    </Form>
  );
}
