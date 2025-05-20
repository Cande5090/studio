
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/wardrobe');
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <p>Redirigiendo a tu armario...</p>
    </div>
  );
}
