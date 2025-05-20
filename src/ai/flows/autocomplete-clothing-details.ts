
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
  type: z.string().describe('El tipo de prenda (ej. Camisa, Vestido, Pantalón). Trata de ser específico.'),
  color: z.string().describe('El color principal de la prenda (ej. Azul marino, Rojo vibrante, Estampado floral).'),
  season: z.string().describe('La temporada o estación para la que es más adecuada la prenda. Debe ser uno de: Primavera, Verano, Otoño, Invierno, Para todo el año.'),
  fabric: z.string().describe('El tejido principal de la prenda (ej. Algodón, Seda, Poliéster, Lino, Lana).'),
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
  prompt: `Eres un asistente de IA experto en analizar imágenes de prendas de vestir y sugerir detalles sobre ellas. Todas tus respuestas deben ser en ESPAÑOL.

Tu tarea es analizar la siguiente imagen y proporcionar la siguiente información:
1.  **Tipo**: El tipo de prenda (ej. Camisa, Vestido, Pantalón, Zapato, Chaqueta, Falda, Jersey, Accesorio).
2.  **Color**: El color predominante de la prenda (ej. Azul marino, Rojo vibrante, Blanco, Negro, Beige, Estampado floral).
3.  **Temporada**: La temporada o estación para la que es más adecuada la prenda. **Debes seleccionar OBLIGATORIAMENTE uno de los siguientes valores exactos: "Primavera", "Verano", "Otoño", "Invierno", "Para todo el año"**.
4.  **Tejido**: El tejido principal de la prenda (ej. Algodón, Seda, Poliéster, Lino, Lana, Denim, Cuero Sintético).

**Es crucial que proporciones valores para los cuatro campos solicitados: tipo, color, temporada y tejido. Intenta completar todos estos campos.**

Imagen: {{media url=photoDataUri}}

Por favor, devuelve la información estructurada según el esquema de salida. Recuerda, todas las respuestas en ESPAÑOL.
Para el campo 'temporada', reitero, elige solo entre: "Primavera", "Verano", "Otoño", "Invierno", "Para todo el año".`,
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
