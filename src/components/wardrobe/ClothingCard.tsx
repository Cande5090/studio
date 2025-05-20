
import Image from "next/image";
import type { ClothingItem } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Palette, Snowflake, Sun, Droplets } from "lucide-react"; // Example icons

interface ClothingCardProps {
  item: ClothingItem;
}

export function ClothingCard({ item }: ClothingCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="aspect-square w-full relative overflow-hidden">
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="clothing item"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-2 truncate" title={item.name}>{item.name}</CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span>{item.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <span>{item.color}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.season.toLowerCase().includes("invierno") || item.season.toLowerCase().includes("otoño") ? <Snowflake className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            <span>{item.season}</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <span>{item.fabric}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {/* Future actions like Edit/Delete can go here */}
        {/* <Button variant="outline" size="sm">Editar</Button> */}
      </CardFooter>
    </Card>
  );
}
