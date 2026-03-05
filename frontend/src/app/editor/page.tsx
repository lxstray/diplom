'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import EditorPage from '@/features/editor/EditorPage';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function EditorRoutePage() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to be ready
    const checkAuth = async () => {
      await supabase.auth.getSession();
      setIsReady(true);
    };
    checkAuth();
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return <EditorPage initialRoomId={roomParam || undefined} />;
}
