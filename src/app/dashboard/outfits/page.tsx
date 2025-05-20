
"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Construction } from "lucide-react";

export default function OutfitsPage() {
  // Placeholder state and functions for outfit management
  // const [outfits, setOutfits] = useState([]);
  // const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mis Atuendos</h1>
        <Button disabled>
          <PlusCircle className="mr-2 h-5 w-5" />
          Crear Atuendo (Próximamente)
        </Button>
      </div>

      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
        <Construction className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Página en Construcción</h2>
        <p className="text-muted-foreground">
          La funcionalidad para crear y ver tus atuendos manualmente estará disponible pronto.
        </p>
      </div>

      {/* 
      // Future implementation:
      {isLoading && <p>Cargando atuendos...</p>}
      {!isLoading && outfits.length === 0 && (
        <p>No has creado ningún atuendo todavía.</p>
      )}
      {!isLoading && outfits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map((outfit) => (
            // <OutfitCard key={outfit.id} outfit={outfit} />
            <div key={outfit.id}>Outfit Card Placeholder</div>
          ))}
        </div>
      )}
      */}
    </div>
  );
}
