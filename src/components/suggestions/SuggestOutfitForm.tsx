
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { suggestOutfit } from "@/ai/flows/suggest-outfit";
import type { SuggestOutfitInput, SuggestOutfitOutput } from "@/ai/flows/suggest-outfit";
import type { ClothingItem, WardrobeItemForAI } from "@/types";

const formSchema = z.object({
  occasion: z.string().min(3, { message: "La ocasión debe tener al menos 3 caracteres." }).max(50, { message: "La ocasión no puede exceder los 50 caracteres." }),
});

interface SuggestOutfitFormProps {
  wardrobe: ClothingItem[];
  onSuggestionReceived: (suggestion: SuggestOutfitOutput) => void;
  setIsSuggesting: (isSuggesting: boolean) => void;
  isSuggesting: boolean;
}

export function SuggestOutfitForm({ wardrobe, onSuggestionReceived, setIsSuggesting, isSuggesting }: SuggestOutfitFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occasion: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (wardrobe.length === 0) {
      toast({ title: "Armario vacío", description: "Añade prendas a tu armario antes de pedir sugerencias.", variant: "destructive" });
      return;
    }

    setIsSuggesting(true);
    try {
      const wardrobeForAI: WardrobeItemForAI[] = wardrobe.map(item => ({
        imageUrl: item.imageUrl, // The AI model might not use this directly but it's part of the schema
        type: item.type,
        color: item.color,
        season: item.season,
        material: item.fabric, // Mapping fabric to material
      }));

      const input: SuggestOutfitInput = {
        occasion: values.occasion,
        wardrobe: wardrobeForAI,
      };
      
      const result = await suggestOutfit(input);
      onSuggestionReceived(result);

    } catch (error) {
      console.error("Error suggesting outfit:", error);
      toast({ title: "Error de IA", description: "No se pudo sugerir un atuendo. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
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
