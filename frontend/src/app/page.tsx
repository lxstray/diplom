'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Code2, BookOpen, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Redirect to sign in or show landing page
        return;
      }
      // Redirect to tasks page for authenticated users
      router.push('/tasks');
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Diplom</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/tasks">
                <Button variant="outline">Go to Tasks</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Learn to Code with Real-time Collaboration
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Solve coding challenges, collaborate with others, and track your progress
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/tasks">
              <Button size="lg" className="gap-2">
                <BookOpen className="h-5 w-5" />
                Browse Tasks
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-card border">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Coding Challenges</h3>
            <p className="text-muted-foreground">
              Practice with hundreds of JavaScript exercises from Exercism
            </p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card border">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Collaborative Editing</h3>
            <p className="text-muted-foreground">
              Code together in real-time with CRDT-based synchronization
            </p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card border">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-muted-foreground">
              Monitor your improvement with detailed statistics and activity graphs
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
