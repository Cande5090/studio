
// Autocomplete clothing details flow.
'use server';

/**
 * @fileOverview A flow that uses AI to automatically suggest clothing details based on an image.
 *
 * - autocompleteClothingDetails - A function that handles the clothing details auto-completion process.
 * - AutocompleteClothingDetailsInput - The input type for the autocompleteClothingDetails function.
 * - AutocompleteClothingDetailsOutput - The return type for the autocompleteClothingDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutocompleteClothingDetailsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AutocompleteClothingDetailsInput = z.infer<
  typeof AutocompleteClothingDetailsInputSchema
>;

const AutocompleteClothingDetailsOutputSchema = z.object({
  type: z.string().describe('El tipo de prenda (ej. Camisa, Vestido, Pantalón).'),
  color: z.string().describe('El color de la prenda (ej. Azul marino, Rojo).'),
  season: z.string().describe('La temporada o estación para la que es más adecuada la prenda (ej. Verano, Invierno, Primavera, Otoño, Para todo el año).'),
  fabric: z.string().describe('El tejido de la prenda (ej. Algodón, Seda, Poliéster, Lino).'),
});
export type AutocompleteClothingDetailsOutput = z.infer<
  typeof AutocompleteClothingDetailsOutputSchema
>;

export async function autocompleteClothingDetails(
  input: AutocompleteClothingDetailsInput
): Promise<AutocompleteClothingDetailsOutput> {
  return autocompleteClothingDetailsFlow(input);
}

const autocompleteClothingDetailsPrompt = ai.definePrompt({
  name: 'autocompleteClothingDetailsPrompt',
  input: {schema: AutocompleteClothingDetailsInputSchema},
  output: {schema: AutocompleteClothingDetailsOutputSchema},
  prompt: `Eres un asistente de IA experto en analizar imágenes de prendas de vestir y sugerir detalles sobre ellas.
Tu tarea es analizar la siguiente imagen y proporcionar el **tipo** de prenda, su **color**, la **temporada (o estación)** para la que es más adecuada, y el **tejido** principal.
**Es crucial que proporciones valores para los cuatro campos solicitados: tipo, color, temporada (o estación), y tejido. Intenta completar todos estos campos. Todas tus respuestas deben ser en español.**

Imagen: {{media url=photoDataUri}}

Por favor, devuelve la información estructurada según el esquema de salida. Ejemplos de valores esperados (en español):
- Tipo: (ej. Camisa, Vestido, Pantalón, Zapato, Chaqueta, Falda, Jersey, Accesorio)
- Color: (ej. Azul marino, Rojo vibrante, Blanco, Negro, Beige, Estampado floral)
- Temporada: (ej. Verano, Invierno, Otoño, Primavera, Para todo el año)
- Tejido: (ej. Algodón, Seda, Poliéster, Lino, Lana, Denim, Cuero Sintético)`,
});

const autocompleteClothingDetailsFlow = ai.defineFlow(
  {
    name: 'autocompleteClothingDetailsFlow',
    inputSchema: AutocompleteClothingDetailsInputSchema,
    outputSchema: AutocompleteClothingDetailsOutputSchema,
  },
  async input => {
    const {output} = await autocompleteClothingDetailsPrompt(input);
    return output!;
  }
);

