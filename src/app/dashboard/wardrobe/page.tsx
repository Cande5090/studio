
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { PlusCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClothingItem } from "@/types";
import { ClothingCard } from "@/components/wardrobe/ClothingCard";
import { AddClothingItemForm } from "@/components/wardrobe/AddClothingItemForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function WardrobePage() {
  const { user } = useAuth();
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const q = query(
        collection(db, "clothingItems"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: ClothingItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as ClothingItem);
        });
        setClothingItems(items);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching clothing items:", error);
        setIsLoading(false);
        // Handle error (e.g., show toast)
      });
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mi Armario</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" />
              Añadir Prenda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Añadir Nueva Prenda</DialogTitle>
              <DialogDescription>
                Sube una foto y completa los detalles de tu prenda. Puedes usar la IA para autocompletar.
              </DialogDescription>
            </DialogHeader>
            <AddClothingItemForm setOpen={setIsAddDialogOpen} onItemAdded={() => { /* Optionally refetch or rely on snapshot */ }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && clothingItems.length === 0 && (
        <div className="text-center py-12">
          <Shirt className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Tu armario está vacío</h2>
          <p className="text-muted-foreground mb-6">
            Empieza añadiendo prendas para organizar tu estilo.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Añadir mi primera prenda
          </Button>
        </div>
      )}

      {!isLoading && clothingItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {clothingItems.map((item) => (
            <ClothingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[250px] w-full rounded-xl" />
      <div className="space-y-2 p-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// Placeholder Shirt icon if needed, or use one from lucide-react
const Shirt = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-shirt", className)}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
  </svg>
);
